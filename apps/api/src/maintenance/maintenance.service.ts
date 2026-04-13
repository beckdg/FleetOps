import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  MaintenanceEventType,
  MaintenanceRecord,
  MaintenanceStatus,
  MaintenanceType,
  Prisma,
  VehicleStatus,
} from '@prisma/client';
import { MaintenanceRecordResponse } from '@fleetops/shared-types';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { WEBHOOK_EVENT_TYPES } from '../integrations/constants/integrations.constants';
import { WebhookPublisherService } from '../integrations/webhook-publisher.service';
import { NotificationEventService } from '../notifications/notification-events.service';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { UserRepository } from '../users/users.repository';
import { VehicleRepository } from '../vehicles/vehicles.repository';
import {
  isAllowedMaintenanceTransition,
  maintenanceTransitionErrorMessage,
  STATUS_TO_MAINTENANCE_EVENT_TYPE,
} from './constants/maintenance.constants';
import {
  CreateMaintenanceRecordData,
  MaintenanceRecordRepository,
} from './maintenance-records.repository';
import { toMaintenanceRecordResponse } from './maintenance.mapper';

export interface ScheduleMaintenanceInput {
  organizationId: string;
  vehicleId: string;
  title: string;
  description?: string;
  maintenanceType: MaintenanceType;
  scheduledAt: string;
  estimatedCost?: string;
  createdByUserId: string;
}

export interface MaintenanceActionInput {
  organizationId: string;
  maintenanceId: string;
  actorUserId: string;
  notes?: string;
  actualCost?: string;
}

@Injectable()
export class MaintenanceService {
  constructor(
    private readonly maintenanceRecordRepository: MaintenanceRecordRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly fleetAuditService: FleetAuditService,
    private readonly notificationEventService: NotificationEventService,
    private readonly webhookPublisherService: WebhookPublisherService,
  ) {}

  async scheduleMaintenance(input: ScheduleMaintenanceInput): Promise<MaintenanceRecordResponse> {
    await this.organizationRepository.requireById(input.organizationId);
    await this.userRepository.requireActiveInOrganization(
      input.createdByUserId,
      input.organizationId,
    );
    await this.vehicleRepository.requireInOrganization(input.vehicleId, input.organizationId);

    const scheduledAt = new Date(input.scheduledAt);

    if (Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Invalid scheduled date');
    }

    const data: CreateMaintenanceRecordData = {
      organizationId: input.organizationId,
      vehicleId: input.vehicleId,
      title: input.title,
      description: input.description,
      maintenanceType: input.maintenanceType,
      scheduledAt,
      estimatedCost: input.estimatedCost ? new Prisma.Decimal(input.estimatedCost) : undefined,
      createdByUserId: input.createdByUserId,
    };

    const { record } = await this.maintenanceRecordRepository.createWithEvent(data, {
      eventType: MaintenanceEventType.MAINTENANCE_SCHEDULED,
      createdByUserId: input.createdByUserId,
    });

    this.fleetAuditService.logMaintenanceScheduled({
      organizationId: record.organizationId,
      maintenanceId: record.id,
      vehicleId: record.vehicleId,
      createdByUserId: input.createdByUserId,
    });

    return toMaintenanceRecordResponse(record);
  }

  async startMaintenance(input: MaintenanceActionInput): Promise<MaintenanceRecordResponse> {
    return this.transitionMaintenance(
      input,
      MaintenanceStatus.IN_PROGRESS,
      async (record, vehicleAudit) => {
        this.fleetAuditService.logMaintenanceStarted({
          organizationId: record.organizationId,
          maintenanceId: record.id,
          vehicleId: record.vehicleId,
          startedByUserId: input.actorUserId,
        });

        if (vehicleAudit) {
          this.fleetAuditService.logVehicleStatusChanged(vehicleAudit);
        }

        await this.notificationEventService.onMaintenanceStarted(record, record.createdByUserId);

        await this.webhookPublisherService.publish(
          record.organizationId,
          WEBHOOK_EVENT_TYPES.MAINTENANCE_STARTED,
          this.buildMaintenanceWebhookPayload(record),
        );
      },
      {
        startedAt: new Date(),
        setVehicleStatus: VehicleStatus.IN_MAINTENANCE,
      },
    );
  }

  async completeMaintenance(input: MaintenanceActionInput): Promise<MaintenanceRecordResponse> {
    return this.transitionMaintenance(
      input,
      MaintenanceStatus.COMPLETED,
      async (record, vehicleAudit) => {
        this.fleetAuditService.logMaintenanceCompleted({
          organizationId: record.organizationId,
          maintenanceId: record.id,
          vehicleId: record.vehicleId,
          completedByUserId: input.actorUserId,
        });

        if (vehicleAudit) {
          this.fleetAuditService.logVehicleStatusChanged(vehicleAudit);
        }

        await this.notificationEventService.onMaintenanceCompleted(record, record.createdByUserId);

        await this.webhookPublisherService.publish(
          record.organizationId,
          WEBHOOK_EVENT_TYPES.MAINTENANCE_COMPLETED,
          this.buildMaintenanceWebhookPayload(record),
        );
      },
      {
        completedAt: new Date(),
        actualCost: input.actualCost ? new Prisma.Decimal(input.actualCost) : undefined,
        restoreVehicleIfNoOtherInProgress: true,
      },
    );
  }

  async cancelMaintenance(input: MaintenanceActionInput): Promise<MaintenanceRecordResponse> {
    return this.transitionMaintenance(
      input,
      MaintenanceStatus.CANCELLED,
      async (record, vehicleAudit) => {
        this.fleetAuditService.logMaintenanceCancelled({
          organizationId: record.organizationId,
          maintenanceId: record.id,
          vehicleId: record.vehicleId,
          cancelledByUserId: input.actorUserId,
        });

        if (vehicleAudit) {
          this.fleetAuditService.logVehicleStatusChanged(vehicleAudit);
        }
      },
      {
        restoreVehicleIfNoOtherInProgress: true,
      },
    );
  }

  async listVehicleMaintenance(
    organizationId: string,
    vehicleId: string,
  ): Promise<MaintenanceRecordResponse[]> {
    await this.vehicleRepository.requireInOrganization(vehicleId, organizationId);
    const records = await this.maintenanceRecordRepository.findByVehicle(organizationId, vehicleId);
    return records.map(toMaintenanceRecordResponse);
  }

  async findByOrganization(organizationId: string): Promise<MaintenanceRecordResponse[]> {
    await this.organizationRepository.requireById(organizationId);
    const records = await this.maintenanceRecordRepository.findByOrganization(organizationId);
    return records.map(toMaintenanceRecordResponse);
  }

  assertAllowedTransition(from: MaintenanceStatus, to: MaintenanceStatus): void {
    if (!isAllowedMaintenanceTransition(from, to)) {
      throw new BadRequestException(maintenanceTransitionErrorMessage(from, to));
    }
  }

  private async transitionMaintenance(
    input: MaintenanceActionInput,
    targetStatus: MaintenanceStatus,
    afterTransition: (
      record: MaintenanceRecord,
      vehicleAudit?: {
        organizationId: string;
        vehicleId: string;
        previousStatus: VehicleStatus;
        newStatus: VehicleStatus;
        changedByUserId: string;
      },
    ) => Promise<void>,
    timestamps: {
      startedAt?: Date;
      completedAt?: Date;
      actualCost?: Prisma.Decimal;
      setVehicleStatus?: VehicleStatus;
      restoreVehicleIfNoOtherInProgress?: boolean;
    } = {},
  ): Promise<MaintenanceRecordResponse> {
    await this.userRepository.requireActiveInOrganization(input.actorUserId, input.organizationId);

    const record = await this.maintenanceRecordRepository.requireInOrganization(
      input.maintenanceId,
      input.organizationId,
    );

    this.assertAllowedTransition(record.status, targetStatus);

    const eventType = STATUS_TO_MAINTENANCE_EVENT_TYPE[targetStatus];

    if (!eventType) {
      throw new BadRequestException(`Unsupported maintenance transition to ${targetStatus}`);
    }

    const shouldRestoreVehicle =
      timestamps.restoreVehicleIfNoOtherInProgress &&
      (targetStatus === MaintenanceStatus.COMPLETED ||
        (targetStatus === MaintenanceStatus.CANCELLED &&
          record.status === MaintenanceStatus.IN_PROGRESS));

    try {
      const result = await this.maintenanceRecordRepository.transitionWithEvent(
        record.id,
        input.organizationId,
        {
          status: targetStatus,
          startedAt: timestamps.startedAt ?? record.startedAt,
          completedAt: timestamps.completedAt ?? record.completedAt,
          actualCost: timestamps.actualCost ?? record.actualCost,
        },
        {
          eventType,
          createdByUserId: input.actorUserId,
          notes: input.notes,
        },
        {
          setVehicleStatus: timestamps.setVehicleStatus,
          restoreVehicleIfNoOtherInProgress: shouldRestoreVehicle,
        },
      );

      const vehicleAudit =
        result.vehicle && result.previousVehicleStatus
          ? {
              organizationId: result.vehicle.organizationId,
              vehicleId: result.vehicle.id,
              previousStatus: result.previousVehicleStatus,
              newStatus: result.vehicle.status,
              changedByUserId: input.actorUserId,
            }
          : undefined;

      await afterTransition(result.record, vehicleAudit);

      return toMaintenanceRecordResponse(result.record);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (this.maintenanceRecordRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('Vehicle already has maintenance in progress');
      }

      if (this.maintenanceRecordRepository.isNotFoundError(error)) {
        throw new NotFoundException(`Maintenance record ${input.maintenanceId} not found`);
      }

      throw error;
    }
  }

  private buildMaintenanceWebhookPayload(record: MaintenanceRecord): Record<string, unknown> {
    return {
      maintenanceId: record.id,
      vehicleId: record.vehicleId,
      title: record.title,
      maintenanceType: record.maintenanceType,
      status: record.status,
    };
  }
}

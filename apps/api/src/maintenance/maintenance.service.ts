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
  Vehicle,
  VehicleStatus,
} from '@prisma/client';
import { MaintenanceRecordResponse } from '@fleetops/shared-types';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { UserRepository } from '../users/users.repository';
import { VehicleRepository } from '../vehicles/vehicles.repository';
import {
  isAllowedMaintenanceTransition,
  maintenanceTransitionErrorMessage,
  STATUS_TO_MAINTENANCE_EVENT_TYPE,
} from './constants/maintenance.constants';
import { MaintenanceEventService } from './maintenance-events.service';
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
    private readonly maintenanceEventService: MaintenanceEventService,
    private readonly vehicleRepository: VehicleRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly fleetAuditService: FleetAuditService,
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

    const record = await this.maintenanceRecordRepository.create(data);

    await this.maintenanceEventService.recordEvent({
      maintenanceRecordId: record.id,
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
      async (record) => {
        await this.syncVehicleToMaintenance(
          record.vehicleId,
          record.organizationId,
          input.actorUserId,
        );

        this.fleetAuditService.logMaintenanceStarted({
          organizationId: record.organizationId,
          maintenanceId: record.id,
          vehicleId: record.vehicleId,
          startedByUserId: input.actorUserId,
        });
      },
      { startedAt: new Date() },
    );
  }

  async completeMaintenance(input: MaintenanceActionInput): Promise<MaintenanceRecordResponse> {
    return this.transitionMaintenance(
      input,
      MaintenanceStatus.COMPLETED,
      async (record) => {
        await this.syncVehicleToActiveIfNoMaintenance(
          record.vehicleId,
          record.organizationId,
          input.actorUserId,
        );

        this.fleetAuditService.logMaintenanceCompleted({
          organizationId: record.organizationId,
          maintenanceId: record.id,
          vehicleId: record.vehicleId,
          completedByUserId: input.actorUserId,
        });
      },
      {
        completedAt: new Date(),
        actualCost: input.actualCost ? new Prisma.Decimal(input.actualCost) : undefined,
      },
    );
  }

  async cancelMaintenance(input: MaintenanceActionInput): Promise<MaintenanceRecordResponse> {
    return this.transitionMaintenance(input, MaintenanceStatus.CANCELLED, async (record) => {
      if (record.status === MaintenanceStatus.IN_PROGRESS) {
        await this.syncVehicleToActiveIfNoMaintenance(
          record.vehicleId,
          record.organizationId,
          input.actorUserId,
        );
      }

      this.fleetAuditService.logMaintenanceCancelled({
        organizationId: record.organizationId,
        maintenanceId: record.id,
        vehicleId: record.vehicleId,
        cancelledByUserId: input.actorUserId,
      });
    });
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
    afterTransition: (record: MaintenanceRecord) => Promise<void>,
    timestamps: {
      startedAt?: Date;
      completedAt?: Date;
      actualCost?: Prisma.Decimal;
    } = {},
  ): Promise<MaintenanceRecordResponse> {
    await this.userRepository.requireActiveInOrganization(input.actorUserId, input.organizationId);

    const record = await this.maintenanceRecordRepository.requireInOrganization(
      input.maintenanceId,
      input.organizationId,
    );

    this.assertAllowedTransition(record.status, targetStatus);

    try {
      const updated = await this.maintenanceRecordRepository.update(record.id, {
        status: targetStatus,
        startedAt: timestamps.startedAt ?? record.startedAt,
        completedAt: timestamps.completedAt ?? record.completedAt,
        actualCost: timestamps.actualCost ?? record.actualCost,
      });

      const eventType = STATUS_TO_MAINTENANCE_EVENT_TYPE[targetStatus];

      if (eventType) {
        await this.maintenanceEventService.recordEvent({
          maintenanceRecordId: updated.id,
          eventType,
          createdByUserId: input.actorUserId,
          notes: input.notes,
        });
      }

      await afterTransition(updated);

      return toMaintenanceRecordResponse(updated);
    } catch (error) {
      if (this.maintenanceRecordRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('Vehicle already has maintenance in progress');
      }

      if (this.maintenanceRecordRepository.isNotFoundError(error)) {
        throw new NotFoundException(`Maintenance record ${input.maintenanceId} not found`);
      }

      throw error;
    }
  }

  private async syncVehicleToMaintenance(
    vehicleId: string,
    organizationId: string,
    actorUserId: string,
  ): Promise<void> {
    const vehicle = await this.vehicleRepository.requireInOrganization(vehicleId, organizationId);

    if (vehicle.status === VehicleStatus.IN_MAINTENANCE) {
      return;
    }

    await this.updateVehicleStatus(vehicle, VehicleStatus.IN_MAINTENANCE, actorUserId);
  }

  private async syncVehicleToActiveIfNoMaintenance(
    vehicleId: string,
    organizationId: string,
    actorUserId: string,
  ): Promise<void> {
    const activeMaintenance =
      await this.maintenanceRecordRepository.findInProgressByVehicleId(vehicleId);

    if (activeMaintenance.length > 0) {
      return;
    }

    const vehicle = await this.vehicleRepository.requireInOrganization(vehicleId, organizationId);

    if (vehicle.status !== VehicleStatus.IN_MAINTENANCE) {
      return;
    }

    await this.updateVehicleStatus(vehicle, VehicleStatus.ACTIVE, actorUserId);
  }

  private async updateVehicleStatus(
    vehicle: Vehicle,
    status: VehicleStatus,
    actorUserId: string,
  ): Promise<void> {
    const previousStatus = vehicle.status;
    await this.vehicleRepository.updateStatus(vehicle.id, { status });

    this.fleetAuditService.logVehicleStatusChanged({
      organizationId: vehicle.organizationId,
      vehicleId: vehicle.id,
      previousStatus,
      newStatus: status,
      changedByUserId: actorUserId,
    });
  }
}

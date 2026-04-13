import { Injectable, NotFoundException } from '@nestjs/common';
import {
  MaintenanceEvent,
  MaintenanceEventType,
  MaintenanceRecord,
  MaintenanceStatus,
  MaintenanceType,
  Prisma,
  Vehicle,
  VehicleStatus,
} from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateMaintenanceRecordData {
  organizationId: string;
  vehicleId: string;
  title: string;
  description?: string;
  maintenanceType: MaintenanceType;
  scheduledAt: Date;
  estimatedCost?: Prisma.Decimal;
  createdByUserId: string;
}

export interface UpdateMaintenanceRecordData {
  status: MaintenanceStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  actualCost?: Prisma.Decimal | null;
}

export interface MaintenanceTransitionEventData {
  eventType: MaintenanceEventType;
  createdByUserId: string;
  notes?: string;
}

export interface MaintenanceTransitionResult {
  record: MaintenanceRecord;
  event: MaintenanceEvent;
  vehicle?: Vehicle;
  previousVehicleStatus?: VehicleStatus;
}

@Injectable()
export class MaintenanceRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithEvent(
    data: CreateMaintenanceRecordData,
    event: MaintenanceTransitionEventData,
  ): Promise<MaintenanceTransitionResult> {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.maintenanceRecord.create({
        data: {
          organizationId: data.organizationId,
          vehicleId: data.vehicleId,
          title: data.title,
          description: data.description,
          maintenanceType: data.maintenanceType,
          scheduledAt: data.scheduledAt,
          estimatedCost: data.estimatedCost,
          createdByUserId: data.createdByUserId,
          status: MaintenanceStatus.SCHEDULED,
        },
      });

      const maintenanceEvent = await tx.maintenanceEvent.create({
        data: {
          maintenanceRecordId: record.id,
          eventType: event.eventType,
          createdByUserId: event.createdByUserId,
          notes: event.notes,
        },
      });

      return { record, event: maintenanceEvent };
    });
  }

  transitionWithEvent(
    maintenanceId: string,
    organizationId: string,
    update: UpdateMaintenanceRecordData,
    event: MaintenanceTransitionEventData,
    options: {
      setVehicleStatus?: VehicleStatus;
      restoreVehicleIfNoOtherInProgress?: boolean;
    } = {},
  ): Promise<MaintenanceTransitionResult> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.maintenanceRecord.findFirst({
        where: { id: maintenanceId, organizationId },
      });

      if (!existing) {
        throw new NotFoundException(
          `Maintenance record ${maintenanceId} not found in organization ${organizationId}`,
        );
      }

      const record = await tx.maintenanceRecord.update({
        where: { id: maintenanceId },
        data: {
          status: update.status,
          startedAt: update.startedAt,
          completedAt: update.completedAt,
          actualCost: update.actualCost,
        },
      });

      const maintenanceEvent = await tx.maintenanceEvent.create({
        data: {
          maintenanceRecordId: record.id,
          eventType: event.eventType,
          createdByUserId: event.createdByUserId,
          notes: event.notes,
        },
      });

      let vehicle: Vehicle | undefined;
      let previousVehicleStatus: VehicleStatus | undefined;

      if (options.setVehicleStatus) {
        const currentVehicle = await tx.vehicle.findFirst({
          where: { id: record.vehicleId, organizationId },
        });

        if (currentVehicle && currentVehicle.status !== options.setVehicleStatus) {
          previousVehicleStatus = currentVehicle.status;
          vehicle = await tx.vehicle.update({
            where: { id: currentVehicle.id },
            data: { status: options.setVehicleStatus },
          });
        }
      }

      if (options.restoreVehicleIfNoOtherInProgress) {
        const inProgressCount = await tx.maintenanceRecord.count({
          where: {
            vehicleId: record.vehicleId,
            status: MaintenanceStatus.IN_PROGRESS,
            id: { not: maintenanceId },
          },
        });

        if (inProgressCount === 0) {
          const currentVehicle = await tx.vehicle.findFirst({
            where: { id: record.vehicleId, organizationId },
          });

          if (currentVehicle && currentVehicle.status === VehicleStatus.IN_MAINTENANCE) {
            previousVehicleStatus = currentVehicle.status;
            vehicle = await tx.vehicle.update({
              where: { id: currentVehicle.id },
              data: { status: VehicleStatus.ACTIVE },
            });
          }
        }
      }

      return { record, event: maintenanceEvent, vehicle, previousVehicleStatus };
    });
  }

  create(data: CreateMaintenanceRecordData): Promise<MaintenanceRecord> {
    return this.prisma.maintenanceRecord.create({
      data: {
        organizationId: data.organizationId,
        vehicleId: data.vehicleId,
        title: data.title,
        description: data.description,
        maintenanceType: data.maintenanceType,
        scheduledAt: data.scheduledAt,
        estimatedCost: data.estimatedCost,
        createdByUserId: data.createdByUserId,
        status: MaintenanceStatus.SCHEDULED,
      },
    });
  }

  findById(id: string): Promise<MaintenanceRecord | null> {
    return this.prisma.maintenanceRecord.findUnique({ where: { id } });
  }

  findByOrganization(organizationId: string): Promise<MaintenanceRecord[]> {
    return this.prisma.maintenanceRecord.findMany({
      where: { organizationId },
      orderBy: [{ scheduledAt: 'desc' }],
    });
  }

  findByOrganizationInDateRange(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<MaintenanceRecord[]> {
    return this.prisma.maintenanceRecord.findMany({
      where: {
        organizationId,
        ...(startDate || endDate
          ? {
              scheduledAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ scheduledAt: 'desc' }],
    });
  }

  findByVehicle(organizationId: string, vehicleId: string): Promise<MaintenanceRecord[]> {
    return this.prisma.maintenanceRecord.findMany({
      where: { organizationId, vehicleId },
      orderBy: [{ scheduledAt: 'desc' }],
    });
  }

  findInProgressByVehicleId(
    vehicleId: string,
    excludeMaintenanceId?: string,
  ): Promise<MaintenanceRecord[]> {
    return this.prisma.maintenanceRecord.findMany({
      where: {
        vehicleId,
        status: MaintenanceStatus.IN_PROGRESS,
        ...(excludeMaintenanceId ? { id: { not: excludeMaintenanceId } } : {}),
      },
    });
  }

  update(id: string, data: UpdateMaintenanceRecordData): Promise<MaintenanceRecord> {
    return this.prisma.maintenanceRecord.update({
      where: { id },
      data: {
        status: data.status,
        startedAt: data.startedAt,
        completedAt: data.completedAt,
        actualCost: data.actualCost,
      },
    });
  }

  requireById(id: string): Promise<MaintenanceRecord> {
    return this.findById(id).then((record) => {
      if (!record) {
        throw new NotFoundException(`Maintenance record ${id} not found`);
      }

      return record;
    });
  }

  requireInOrganization(maintenanceId: string, organizationId: string): Promise<MaintenanceRecord> {
    return this.prisma.maintenanceRecord
      .findFirst({ where: { id: maintenanceId, organizationId } })
      .then((record) => {
        if (!record) {
          throw new NotFoundException(
            `Maintenance record ${maintenanceId} not found in organization ${organizationId}`,
          );
        }

        return record;
      });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }
}

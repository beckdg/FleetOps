import { Injectable, NotFoundException } from '@nestjs/common';
import { MaintenanceRecord, MaintenanceStatus, MaintenanceType, Prisma } from '@prisma/client';

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

@Injectable()
export class MaintenanceRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    return this.requireById(maintenanceId).then((record) => {
      if (record.organizationId !== organizationId) {
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

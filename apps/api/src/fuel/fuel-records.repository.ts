import { Injectable, NotFoundException } from '@nestjs/common';
import { FuelRecord, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateFuelRecordData {
  organizationId: string;
  vehicleId: string;
  tripId?: string;
  fuelStationId?: string;
  odometerReading: number;
  litersPurchased: Prisma.Decimal;
  pricePerLiter: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  filledAt: Date;
  createdByUserId: string;
}

@Injectable()
export class FuelRecordRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateFuelRecordData): Promise<FuelRecord> {
    return this.prisma.fuelRecord.create({ data });
  }

  findByOrganization(organizationId: string): Promise<FuelRecord[]> {
    return this.prisma.fuelRecord.findMany({
      where: { organizationId },
      orderBy: [{ filledAt: 'desc' }],
    });
  }

  findByOrganizationInDateRange(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<FuelRecord[]> {
    return this.prisma.fuelRecord.findMany({
      where: {
        organizationId,
        ...(startDate || endDate
          ? {
              filledAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ filledAt: 'desc' }],
    });
  }

  findByVehicle(organizationId: string, vehicleId: string): Promise<FuelRecord[]> {
    return this.prisma.fuelRecord.findMany({
      where: { organizationId, vehicleId },
      orderBy: [{ filledAt: 'asc' }],
    });
  }

  findMaxOdometerByVehicle(vehicleId: string): Promise<number | null> {
    return this.prisma.fuelRecord
      .aggregate({
        where: { vehicleId },
        _max: { odometerReading: true },
      })
      .then((result) => result._max.odometerReading);
  }

  requireById(id: string): Promise<FuelRecord> {
    return this.prisma.fuelRecord.findUnique({ where: { id } }).then((record) => {
      if (!record) {
        throw new NotFoundException(`Fuel record ${id} not found`);
      }

      return record;
    });
  }

  requireInOrganization(recordId: string, organizationId: string): Promise<FuelRecord> {
    return this.requireById(recordId).then((record) => {
      if (record.organizationId !== organizationId) {
        throw new NotFoundException(
          `Fuel record ${recordId} not found in organization ${organizationId}`,
        );
      }

      return record;
    });
  }
}

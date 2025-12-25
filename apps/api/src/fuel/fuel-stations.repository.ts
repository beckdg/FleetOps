import { Injectable, NotFoundException } from '@nestjs/common';
import { FuelStation, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateFuelStationData {
  organizationId: string;
  name: string;
  location: string;
}

@Injectable()
export class FuelStationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateFuelStationData): Promise<FuelStation> {
    return this.prisma.fuelStation.create({ data });
  }

  findByOrganization(organizationId: string): Promise<FuelStation[]> {
    return this.prisma.fuelStation.findMany({
      where: { organizationId },
      orderBy: [{ name: 'asc' }],
    });
  }

  requireById(id: string): Promise<FuelStation> {
    return this.prisma.fuelStation.findUnique({ where: { id } }).then((station) => {
      if (!station) {
        throw new NotFoundException(`Fuel station ${id} not found`);
      }

      return station;
    });
  }

  requireInOrganization(stationId: string, organizationId: string): Promise<FuelStation> {
    return this.requireById(stationId).then((station) => {
      if (station.organizationId !== organizationId) {
        throw new NotFoundException(
          `Fuel station ${stationId} not found in organization ${organizationId}`,
        );
      }

      return station;
    });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }
}

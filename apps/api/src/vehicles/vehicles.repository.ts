import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Vehicle, VehicleStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateVehicleData {
  organizationId: string;
  plateNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  status?: VehicleStatus;
}

export interface UpdateVehicleStatusData {
  status: VehicleStatus;
}

@Injectable()
export class VehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVehicleData): Promise<Vehicle> {
    return this.prisma.vehicle.create({
      data: {
        organizationId: data.organizationId,
        plateNumber: data.plateNumber.toUpperCase(),
        vin: data.vin.toUpperCase(),
        make: data.make,
        model: data.model,
        year: data.year,
        status: data.status ?? VehicleStatus.ACTIVE,
      },
    });
  }

  findById(id: string): Promise<Vehicle | null> {
    return this.prisma.vehicle.findUnique({ where: { id } });
  }

  findByOrganization(organizationId: string): Promise<Vehicle[]> {
    return this.prisma.vehicle.findMany({
      where: { organizationId },
      orderBy: [{ plateNumber: 'asc' }],
    });
  }

  updateStatus(id: string, data: UpdateVehicleStatusData): Promise<Vehicle> {
    return this.prisma.vehicle.update({
      where: { id },
      data: { status: data.status },
    });
  }

  requireById(id: string): Promise<Vehicle> {
    return this.findById(id).then((vehicle) => {
      if (!vehicle) {
        throw new NotFoundException(`Vehicle ${id} not found`);
      }

      return vehicle;
    });
  }

  requireInOrganization(vehicleId: string, organizationId: string): Promise<Vehicle> {
    return this.prisma.vehicle
      .findFirst({ where: { id: vehicleId, organizationId } })
      .then((vehicle) => {
        if (!vehicle) {
          throw new NotFoundException(
            `Vehicle ${vehicleId} not found in organization ${organizationId}`,
          );
        }

        return vehicle;
      });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }
}

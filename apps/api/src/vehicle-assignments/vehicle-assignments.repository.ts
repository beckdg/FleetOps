import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, VehicleAssignment } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateVehicleAssignmentData {
  organizationId: string;
  vehicleId: string;
  driverId: string;
  assignedByUserId: string;
}

@Injectable()
export class VehicleAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateVehicleAssignmentData): Promise<VehicleAssignment> {
    return this.prisma.vehicleAssignment.create({ data });
  }

  findById(id: string): Promise<VehicleAssignment | null> {
    return this.prisma.vehicleAssignment.findUnique({ where: { id } });
  }

  findActiveByVehicleId(vehicleId: string): Promise<VehicleAssignment | null> {
    return this.prisma.vehicleAssignment.findFirst({
      where: {
        vehicleId,
        endedAt: null,
      },
    });
  }

  findActiveByDriverId(driverId: string): Promise<VehicleAssignment | null> {
    return this.prisma.vehicleAssignment.findFirst({
      where: {
        driverId,
        endedAt: null,
      },
    });
  }

  endAssignment(id: string): Promise<VehicleAssignment> {
    return this.prisma.vehicleAssignment.update({
      where: { id },
      data: { endedAt: new Date() },
    });
  }

  requireById(id: string): Promise<VehicleAssignment> {
    return this.findById(id).then((assignment) => {
      if (!assignment) {
        throw new NotFoundException(`Vehicle assignment ${id} not found`);
      }

      return assignment;
    });
  }

  requireInOrganization(assignmentId: string, organizationId: string): Promise<VehicleAssignment> {
    return this.prisma.vehicleAssignment
      .findFirst({ where: { id: assignmentId, organizationId } })
      .then((assignment) => {
        if (!assignment) {
          throw new NotFoundException(
            `Vehicle assignment ${assignmentId} not found in organization ${organizationId}`,
          );
        }

        return assignment;
      });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }
}

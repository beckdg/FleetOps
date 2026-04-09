import { Injectable, NotFoundException } from '@nestjs/common';
import { Driver, DriverStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateDriverData {
  organizationId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  licenseExpiryDate: Date;
  status?: DriverStatus;
}

export interface UpdateDriverStatusData {
  status: DriverStatus;
}

@Injectable()
export class DriverRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateDriverData): Promise<Driver> {
    return this.prisma.driver.create({
      data: {
        organizationId: data.organizationId,
        employeeId: data.employeeId,
        firstName: data.firstName,
        lastName: data.lastName,
        licenseNumber: data.licenseNumber.toUpperCase(),
        licenseExpiryDate: data.licenseExpiryDate,
        status: data.status ?? DriverStatus.ACTIVE,
      },
    });
  }

  findById(id: string): Promise<Driver | null> {
    return this.prisma.driver.findUnique({ where: { id } });
  }

  findByOrganization(organizationId: string): Promise<Driver[]> {
    return this.prisma.driver.findMany({
      where: { organizationId },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  }

  updateStatus(id: string, data: UpdateDriverStatusData): Promise<Driver> {
    return this.prisma.driver.update({
      where: { id },
      data: { status: data.status },
    });
  }

  requireById(id: string): Promise<Driver> {
    return this.findById(id).then((driver) => {
      if (!driver) {
        throw new NotFoundException(`Driver ${id} not found`);
      }

      return driver;
    });
  }

  requireInOrganization(driverId: string, organizationId: string): Promise<Driver> {
    return this.prisma.driver
      .findFirst({ where: { id: driverId, organizationId } })
      .then((driver) => {
        if (!driver) {
          throw new NotFoundException(
            `Driver ${driverId} not found in organization ${organizationId}`,
          );
        }

        return driver;
      });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }
}

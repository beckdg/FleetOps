import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Driver, DriverStatus } from '@prisma/client';
import { DriverResponse } from '@fleetops/shared-types';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { CreateDriverData, DriverRepository, UpdateDriverStatusData } from './drivers.repository';
import { toDriverResponse } from './drivers.mapper';

export interface CreateDriverInput {
  organizationId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  licenseExpiryDate: string;
}

export interface UpdateDriverStatusInput {
  organizationId: string;
  driverId: string;
  status: DriverStatus;
  changedByUserId: string;
}

@Injectable()
export class DriverService {
  constructor(
    private readonly driverRepository: DriverRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly fleetAuditService: FleetAuditService,
  ) {}

  async createDriver(input: CreateDriverInput): Promise<DriverResponse> {
    await this.organizationRepository.requireById(input.organizationId);

    const licenseExpiryDate = new Date(input.licenseExpiryDate);

    if (Number.isNaN(licenseExpiryDate.getTime())) {
      throw new BadRequestException('Invalid license expiry date');
    }

    const data: CreateDriverData = {
      organizationId: input.organizationId,
      employeeId: input.employeeId,
      firstName: input.firstName,
      lastName: input.lastName,
      licenseNumber: input.licenseNumber,
      licenseExpiryDate,
    };

    try {
      const driver = await this.driverRepository.create(data);
      return toDriverResponse(driver);
    } catch (error) {
      if (this.driverRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('Driver employee ID or license number already exists');
      }

      throw error;
    }
  }

  async updateDriverStatus(input: UpdateDriverStatusInput): Promise<DriverResponse> {
    const driver = await this.driverRepository.requireInOrganization(
      input.driverId,
      input.organizationId,
    );

    if (driver.status === input.status) {
      return toDriverResponse(driver);
    }

    const data: UpdateDriverStatusData = { status: input.status };

    try {
      const updated = await this.driverRepository.updateStatus(input.driverId, data);

      this.fleetAuditService.logDriverStatusChanged({
        organizationId: input.organizationId,
        driverId: updated.id,
        previousStatus: driver.status,
        newStatus: updated.status,
        changedByUserId: input.changedByUserId,
      });

      return toDriverResponse(updated);
    } catch (error) {
      if (this.driverRepository.isNotFoundError(error)) {
        throw new NotFoundException(`Driver ${input.driverId} not found`);
      }

      throw error;
    }
  }

  async findById(organizationId: string, driverId: string): Promise<DriverResponse> {
    const driver = await this.driverRepository.requireInOrganization(driverId, organizationId);
    return toDriverResponse(driver);
  }

  async findByOrganization(organizationId: string): Promise<DriverResponse[]> {
    await this.organizationRepository.requireById(organizationId);
    const drivers = await this.driverRepository.findByOrganization(organizationId);
    return drivers.map(toDriverResponse);
  }

  async requireAssignableDriver(driverId: string, organizationId: string): Promise<Driver> {
    return this.driverRepository.requireInOrganization(driverId, organizationId);
  }
}

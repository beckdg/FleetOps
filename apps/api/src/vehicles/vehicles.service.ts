import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Vehicle, VehicleStatus } from '@prisma/client';
import { VehicleResponse } from '@fleetops/shared-types';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { OrganizationRepository } from '../organizations/organizations.repository';
import {
  CreateVehicleData,
  UpdateVehicleStatusData,
  VehicleRepository,
} from './vehicles.repository';
import { toVehicleResponse } from './vehicles.mapper';

export interface CreateVehicleInput {
  organizationId: string;
  plateNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
}

export interface UpdateVehicleStatusInput {
  organizationId: string;
  vehicleId: string;
  status: VehicleStatus;
  changedByUserId: string;
}

@Injectable()
export class VehicleService {
  constructor(
    private readonly vehicleRepository: VehicleRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly fleetAuditService: FleetAuditService,
  ) {}

  async createVehicle(input: CreateVehicleInput): Promise<VehicleResponse> {
    await this.organizationRepository.requireById(input.organizationId);

    if (input.year < 1900 || input.year > new Date().getFullYear() + 1) {
      throw new BadRequestException('Vehicle year is out of valid range');
    }

    const data: CreateVehicleData = {
      organizationId: input.organizationId,
      plateNumber: input.plateNumber,
      vin: input.vin,
      make: input.make,
      model: input.model,
      year: input.year,
    };

    try {
      const vehicle = await this.vehicleRepository.create(data);
      return toVehicleResponse(vehicle);
    } catch (error) {
      if (this.vehicleRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('Vehicle plate number or VIN already exists');
      }

      throw error;
    }
  }

  async updateVehicleStatus(input: UpdateVehicleStatusInput): Promise<VehicleResponse> {
    const vehicle = await this.vehicleRepository.requireInOrganization(
      input.vehicleId,
      input.organizationId,
    );

    if (vehicle.status === input.status) {
      return toVehicleResponse(vehicle);
    }

    const data: UpdateVehicleStatusData = { status: input.status };

    try {
      const updated = await this.vehicleRepository.updateStatus(input.vehicleId, data);

      this.fleetAuditService.logVehicleStatusChanged({
        organizationId: input.organizationId,
        vehicleId: updated.id,
        previousStatus: vehicle.status,
        newStatus: updated.status,
        changedByUserId: input.changedByUserId,
      });

      return toVehicleResponse(updated);
    } catch (error) {
      if (this.vehicleRepository.isNotFoundError(error)) {
        throw new NotFoundException(`Vehicle ${input.vehicleId} not found`);
      }

      throw error;
    }
  }

  async findById(organizationId: string, vehicleId: string): Promise<VehicleResponse> {
    const vehicle = await this.vehicleRepository.requireInOrganization(vehicleId, organizationId);
    return toVehicleResponse(vehicle);
  }

  async findByOrganization(organizationId: string): Promise<VehicleResponse[]> {
    await this.organizationRepository.requireById(organizationId);
    const vehicles = await this.vehicleRepository.findByOrganization(organizationId);
    return vehicles.map(toVehicleResponse);
  }

  async requireAssignableVehicle(vehicleId: string, organizationId: string): Promise<Vehicle> {
    return this.vehicleRepository.requireInOrganization(vehicleId, organizationId);
  }
}

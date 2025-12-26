import { ConflictException, Injectable } from '@nestjs/common';
import { FuelStationResponse } from '@fleetops/shared-types';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { CreateFuelStationData, FuelStationRepository } from './fuel-stations.repository';
import { toFuelStationResponse } from './fuel.mapper';

export interface CreateFuelStationInput {
  organizationId: string;
  name: string;
  location: string;
}

@Injectable()
export class FuelStationService {
  constructor(
    private readonly fuelStationRepository: FuelStationRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly fleetAuditService: FleetAuditService,
  ) {}

  async createFuelStation(input: CreateFuelStationInput): Promise<FuelStationResponse> {
    await this.organizationRepository.requireById(input.organizationId);

    const data: CreateFuelStationData = {
      organizationId: input.organizationId,
      name: input.name.trim(),
      location: input.location.trim(),
    };

    try {
      const station = await this.fuelStationRepository.create(data);

      this.fleetAuditService.logFuelStationCreated({
        organizationId: station.organizationId,
        fuelStationId: station.id,
        name: station.name,
      });

      return toFuelStationResponse(station);
    } catch (error) {
      if (this.fuelStationRepository.isUniqueConstraintError(error)) {
        throw new ConflictException(`Fuel station "${input.name}" already exists`);
      }

      throw error;
    }
  }

  async findByOrganization(organizationId: string): Promise<FuelStationResponse[]> {
    await this.organizationRepository.requireById(organizationId);
    const stations = await this.fuelStationRepository.findByOrganization(organizationId);
    return stations.map(toFuelStationResponse);
  }
}

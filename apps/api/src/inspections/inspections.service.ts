import { BadRequestException, Injectable } from '@nestjs/common';
import { InspectionResponse } from '@fleetops/shared-types';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { UserRepository } from '../users/users.repository';
import { VehicleRepository } from '../vehicles/vehicles.repository';
import { CreateInspectionData, InspectionRepository } from './inspections.repository';
import { toInspectionResponse } from './inspections.mapper';

export interface CreateInspectionInput {
  organizationId: string;
  vehicleId: string;
  inspectionDate: string;
  passed: boolean;
  notes?: string;
  inspectorName: string;
  createdByUserId: string;
}

@Injectable()
export class InspectionService {
  constructor(
    private readonly inspectionRepository: InspectionRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly fleetAuditService: FleetAuditService,
  ) {}

  async createInspection(input: CreateInspectionInput): Promise<InspectionResponse> {
    await this.organizationRepository.requireById(input.organizationId);
    await this.userRepository.requireActiveInOrganization(
      input.createdByUserId,
      input.organizationId,
    );
    await this.vehicleRepository.requireInOrganization(input.vehicleId, input.organizationId);

    const inspectionDate = new Date(input.inspectionDate);

    if (Number.isNaN(inspectionDate.getTime())) {
      throw new BadRequestException('Invalid inspection date');
    }

    const data: CreateInspectionData = {
      organizationId: input.organizationId,
      vehicleId: input.vehicleId,
      inspectionDate,
      passed: input.passed,
      notes: input.notes,
      inspectorName: input.inspectorName,
      createdByUserId: input.createdByUserId,
    };

    const inspection = await this.inspectionRepository.create(data);

    this.fleetAuditService.logInspectionCreated({
      organizationId: inspection.organizationId,
      inspectionId: inspection.id,
      vehicleId: inspection.vehicleId,
      passed: inspection.passed,
      createdByUserId: input.createdByUserId,
    });

    return toInspectionResponse(inspection);
  }

  async findByOrganization(organizationId: string): Promise<InspectionResponse[]> {
    await this.organizationRepository.requireById(organizationId);
    const inspections = await this.inspectionRepository.findByOrganization(organizationId);
    return inspections.map(toInspectionResponse);
  }
}

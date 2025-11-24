import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VehicleAssignmentResponse } from '@fleetops/shared-types';

import { isDriverAssignable, driverStatusMessage } from '../drivers/constants/driver.constants';
import { DriverRepository } from '../drivers/drivers.repository';
import { FleetAuditService } from '../fleet/fleet-audit.service';
import { UserRepository } from '../users/users.repository';
import { isVehicleAssignable, vehicleStatusMessage } from '../vehicles/constants/vehicle.constants';
import { VehicleRepository } from '../vehicles/vehicles.repository';
import { VehicleAssignmentRepository } from './vehicle-assignments.repository';
import { toVehicleAssignmentResponse } from './vehicle-assignments.mapper';

export interface AssignVehicleToDriverInput {
  organizationId: string;
  vehicleId: string;
  driverId: string;
  assignedByUserId: string;
}

export interface EndAssignmentInput {
  organizationId: string;
  assignmentId: string;
  endedByUserId: string;
}

export interface GetActiveAssignmentInput {
  organizationId: string;
  vehicleId?: string;
  driverId?: string;
}

@Injectable()
export class VehicleAssignmentService {
  constructor(
    private readonly vehicleAssignmentRepository: VehicleAssignmentRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly driverRepository: DriverRepository,
    private readonly userRepository: UserRepository,
    private readonly fleetAuditService: FleetAuditService,
  ) {}

  async assignVehicleToDriver(
    input: AssignVehicleToDriverInput,
  ): Promise<VehicleAssignmentResponse> {
    await this.userRepository.requireActiveInOrganization(
      input.assignedByUserId,
      input.organizationId,
    );

    const vehicle = await this.vehicleRepository.requireInOrganization(
      input.vehicleId,
      input.organizationId,
    );
    const driver = await this.driverRepository.requireInOrganization(
      input.driverId,
      input.organizationId,
    );

    this.assertVehicleAssignable(vehicle.status);
    this.assertDriverAssignable(driver.status);

    const activeVehicleAssignment = await this.vehicleAssignmentRepository.findActiveByVehicleId(
      vehicle.id,
    );
    if (activeVehicleAssignment) {
      throw new ConflictException('Vehicle already has an active assignment');
    }

    const activeDriverAssignment = await this.vehicleAssignmentRepository.findActiveByDriverId(
      driver.id,
    );
    if (activeDriverAssignment) {
      throw new ConflictException('Driver already has an active assignment');
    }

    try {
      const assignment = await this.vehicleAssignmentRepository.create({
        organizationId: input.organizationId,
        vehicleId: vehicle.id,
        driverId: driver.id,
        assignedByUserId: input.assignedByUserId,
      });

      this.fleetAuditService.logVehicleAssigned({
        organizationId: input.organizationId,
        assignmentId: assignment.id,
        vehicleId: assignment.vehicleId,
        driverId: assignment.driverId,
        assignedByUserId: input.assignedByUserId,
      });

      return toVehicleAssignmentResponse(assignment);
    } catch (error) {
      if (this.vehicleAssignmentRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('Vehicle or driver already has an active assignment');
      }

      throw error;
    }
  }

  async endAssignment(input: EndAssignmentInput): Promise<VehicleAssignmentResponse> {
    const assignment = await this.vehicleAssignmentRepository.requireInOrganization(
      input.assignmentId,
      input.organizationId,
    );

    if (assignment.endedAt) {
      throw new BadRequestException('Assignment is already ended');
    }

    try {
      const ended = await this.vehicleAssignmentRepository.endAssignment(assignment.id);

      this.fleetAuditService.logVehicleAssignmentEnded({
        organizationId: input.organizationId,
        assignmentId: ended.id,
        vehicleId: ended.vehicleId,
        driverId: ended.driverId,
        endedByUserId: input.endedByUserId,
      });

      return toVehicleAssignmentResponse(ended);
    } catch (error) {
      if (this.vehicleAssignmentRepository.isNotFoundError(error)) {
        throw new NotFoundException(`Vehicle assignment ${input.assignmentId} not found`);
      }

      throw error;
    }
  }

  async getActiveAssignment(
    input: GetActiveAssignmentInput,
  ): Promise<VehicleAssignmentResponse | null> {
    if (!input.vehicleId && !input.driverId) {
      throw new BadRequestException('Either vehicleId or driverId must be provided');
    }

    if (input.vehicleId && input.driverId) {
      throw new BadRequestException('Provide only one of vehicleId or driverId');
    }

    const assignment = input.vehicleId
      ? await this.vehicleAssignmentRepository.findActiveByVehicleId(input.vehicleId)
      : await this.vehicleAssignmentRepository.findActiveByDriverId(input.driverId!);

    if (!assignment || assignment.organizationId !== input.organizationId) {
      return null;
    }

    return toVehicleAssignmentResponse(assignment);
  }

  assertVehicleAssignable(status: Parameters<typeof isVehicleAssignable>[0]): void {
    if (!isVehicleAssignable(status)) {
      throw new BadRequestException(vehicleStatusMessage(status));
    }
  }

  assertDriverAssignable(status: Parameters<typeof isDriverAssignable>[0]): void {
    if (!isDriverAssignable(status)) {
      throw new BadRequestException(driverStatusMessage(status));
    }
  }
}

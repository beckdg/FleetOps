import { Module } from '@nestjs/common';

import { DriversModule } from '../drivers/drivers.module';
import { FleetModule } from '../fleet/fleet.module';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { VehicleAssignmentRepository } from './vehicle-assignments.repository';
import { VehicleAssignmentService } from './vehicle-assignments.service';
import { VehicleAssignmentsController } from './vehicle-assignments.controller';

@Module({
  imports: [VehiclesModule, DriversModule, UsersModule, FleetModule],
  controllers: [VehicleAssignmentsController],
  providers: [VehicleAssignmentRepository, VehicleAssignmentService],
  exports: [VehicleAssignmentService, VehicleAssignmentRepository],
})
export class VehicleAssignmentsModule {}

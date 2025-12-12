import { Module } from '@nestjs/common';

import { FleetModule } from '../fleet/fleet.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { InspectionRepository } from './inspections.repository';
import { InspectionService } from './inspections.service';
import { InspectionsController } from './inspections.controller';

@Module({
  imports: [OrganizationsModule, UsersModule, VehiclesModule, FleetModule],
  controllers: [InspectionsController],
  providers: [InspectionRepository, InspectionService],
  exports: [InspectionService, InspectionRepository],
})
export class InspectionsModule {}

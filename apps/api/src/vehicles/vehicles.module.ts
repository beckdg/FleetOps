import { Module } from '@nestjs/common';

import { FleetModule } from '../fleet/fleet.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { VehicleRepository } from './vehicles.repository';
import { VehicleService } from './vehicles.service';
import { VehiclesController } from './vehicles.controller';

@Module({
  imports: [OrganizationsModule, FleetModule],
  controllers: [VehiclesController],
  providers: [VehicleRepository, VehicleService],
  exports: [VehicleService, VehicleRepository],
})
export class VehiclesModule {}

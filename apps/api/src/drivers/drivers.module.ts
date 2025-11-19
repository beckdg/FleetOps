import { Module } from '@nestjs/common';

import { FleetModule } from '../fleet/fleet.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DriverRepository } from './drivers.repository';
import { DriverService } from './drivers.service';
import { DriversController } from './drivers.controller';

@Module({
  imports: [OrganizationsModule, FleetModule],
  controllers: [DriversController],
  providers: [DriverRepository, DriverService],
  exports: [DriverService, DriverRepository],
})
export class DriversModule {}

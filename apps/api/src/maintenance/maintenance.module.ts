import { Module } from '@nestjs/common';

import { FleetModule } from '../fleet/fleet.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { MaintenanceEventRepository } from './maintenance-events.repository';
import { MaintenanceEventService } from './maintenance-events.service';
import { MaintenanceRecordRepository } from './maintenance-records.repository';
import { MaintenanceService } from './maintenance.service';
import { MaintenanceController } from './maintenance.controller';

@Module({
  imports: [OrganizationsModule, UsersModule, VehiclesModule, FleetModule],
  controllers: [MaintenanceController],
  providers: [
    MaintenanceRecordRepository,
    MaintenanceEventRepository,
    MaintenanceEventService,
    MaintenanceService,
  ],
  exports: [MaintenanceService, MaintenanceRecordRepository],
})
export class MaintenanceModule {}

import { Module, forwardRef } from '@nestjs/common';

import { DriversModule } from '../drivers/drivers.module';
import { FleetModule } from '../fleet/fleet.module';
import { FuelModule } from '../fuel/fuel.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TripsModule } from '../trips/trips.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { AnalyticsService } from './analytics.service';
import { ReportService } from './report.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [
    OrganizationsModule,
    VehiclesModule,
    DriversModule,
    forwardRef(() => TripsModule),
    forwardRef(() => MaintenanceModule),
    forwardRef(() => FuelModule),
    FleetModule,
  ],
  controllers: [ReportsController],
  providers: [AnalyticsService, ReportService],
  exports: [AnalyticsService, ReportService],
})
export class ReportsModule {}

import { Module, forwardRef } from '@nestjs/common';

import { FleetModule } from '../fleet/fleet.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TripsModule } from '../trips/trips.module';
import { UsersModule } from '../users/users.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { FuelController } from './fuel.controller';
import { FuelRecordRepository } from './fuel-records.repository';
import { FuelRecordService } from './fuel-records.service';
import { FuelStationRepository } from './fuel-stations.repository';
import { FuelStationService } from './fuel-stations.service';

@Module({
  imports: [
    OrganizationsModule,
    UsersModule,
    VehiclesModule,
    forwardRef(() => TripsModule),
    FleetModule,
    NotificationsModule,
    forwardRef(() => IntegrationsModule),
  ],
  controllers: [FuelController],
  providers: [FuelRecordRepository, FuelStationRepository, FuelRecordService, FuelStationService],
  exports: [FuelRecordService, FuelStationService, FuelRecordRepository, FuelStationRepository],
})
export class FuelModule {}

import { Module } from '@nestjs/common';

import { DriversModule } from '../drivers/drivers.module';
import { FleetModule } from '../fleet/fleet.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { VehicleAssignmentsModule } from '../vehicle-assignments/vehicle-assignments.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { TripEventRepository } from './trip-events.repository';
import { TripEventService } from './trip-events.service';
import { TripRepository } from './trips.repository';
import { TripService } from './trips.service';
import { TripsController } from './trips.controller';

@Module({
  imports: [
    OrganizationsModule,
    UsersModule,
    VehiclesModule,
    DriversModule,
    VehicleAssignmentsModule,
    FleetModule,
    NotificationsModule,
  ],
  controllers: [TripsController],
  providers: [TripRepository, TripEventRepository, TripEventService, TripService],
  exports: [TripService, TripRepository, TripEventService],
})
export class TripsModule {}

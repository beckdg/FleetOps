import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../../src/auth/auth.module';
import { AuthorizationModule } from '../../src/authorization/authorization.module';
import { DatabaseModule } from '../../src/database/database.module';
import { DriversModule } from '../../src/drivers/drivers.module';
import { FleetModule } from '../../src/fleet/fleet.module';
import { InspectionsModule } from '../../src/inspections/inspections.module';
import { MaintenanceModule } from '../../src/maintenance/maintenance.module';
import { OrganizationsModule } from '../../src/organizations/organizations.module';
import { PermissionsModule } from '../../src/permissions/permissions.module';
import { RolesModule } from '../../src/roles/roles.module';
import { TripsModule } from '../../src/trips/trips.module';
import { UsersModule } from '../../src/users/users.module';
import { VehicleAssignmentsModule } from '../../src/vehicle-assignments/vehicle-assignments.module';
import { VehiclesModule } from '../../src/vehicles/vehicles.module';
import { envValidationSchema } from '../../src/shared/constants/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: true,
        allowUnknown: true,
      },
    }),
    DatabaseModule,
    OrganizationsModule,
    PermissionsModule,
    UsersModule,
    RolesModule,
    FleetModule,
    VehiclesModule,
    DriversModule,
    VehicleAssignmentsModule,
    TripsModule,
    MaintenanceModule,
    InspectionsModule,
    AuthModule,
    AuthorizationModule,
  ],
})
export class MaintenanceTestModule {}

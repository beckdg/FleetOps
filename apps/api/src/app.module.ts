import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { DatabaseModule } from './database/database.module';
import { DriversModule } from './drivers/drivers.module';
import { FleetModule } from './fleet/fleet.module';
import { FuelModule } from './fuel/fuel.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { QueueModule } from './queues/queue.module';
import { NotificationsModule } from './notifications/notifications.module';
import { HealthModule } from './health/health.module';
import { InspectionsModule } from './inspections/inspections.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PermissionsModule } from './permissions/permissions.module';
import { ReportsModule } from './reports/reports.module';
import { RolesModule } from './roles/roles.module';
import { TestProtectedModule } from './test-protected/test-protected.module';
import { UsersModule } from './users/users.module';
import { TripsModule } from './trips/trips.module';
import { VehicleAssignmentsModule } from './vehicle-assignments/vehicle-assignments.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { envValidationSchema } from './shared/constants/env.validation';

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
    HealthModule,
    OrganizationsModule,
    PermissionsModule,
    AuthModule,
    AuthorizationModule,
    UsersModule,
    RolesModule,
    FleetModule,
    VehiclesModule,
    DriversModule,
    VehicleAssignmentsModule,
    TripsModule,
    MaintenanceModule,
    InspectionsModule,
    FuelModule,
    NotificationsModule,
    IntegrationsModule,
    QueueModule,
    ReportsModule,
    TestProtectedModule,
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './auth/auth.module';
import { AuthorizationModule } from './authorization/authorization.module';
import { DatabaseModule } from './database/database.module';
import { DriversModule } from './drivers/drivers.module';
import { FleetModule } from './fleet/fleet.module';
import { HealthModule } from './health/health.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { PermissionsModule } from './permissions/permissions.module';
import { RolesModule } from './roles/roles.module';
import { TestProtectedModule } from './test-protected/test-protected.module';
import { UsersModule } from './users/users.module';
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
    TestProtectedModule,
  ],
})
export class AppModule {}

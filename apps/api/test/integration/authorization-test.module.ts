import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from '../../src/auth/auth.module';
import { AuthorizationModule } from '../../src/authorization/authorization.module';
import { DatabaseModule } from '../../src/database/database.module';
import { OrganizationsModule } from '../../src/organizations/organizations.module';
import { PermissionsModule } from '../../src/permissions/permissions.module';
import { RolesModule } from '../../src/roles/roles.module';
import { TestProtectedModule } from '../../src/test-protected/test-protected.module';
import { UsersModule } from '../../src/users/users.module';
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
    AuthModule,
    AuthorizationModule,
    TestProtectedModule,
  ],
})
export class AuthorizationTestModule {}

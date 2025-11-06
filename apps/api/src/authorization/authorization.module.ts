import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { PermissionGuard } from './guards/permission.guard';
import { AuthorizationAuditService } from './services/authorization-audit.service';

@Module({
  imports: [PermissionsModule, RolesModule],
  providers: [
    AuthorizationAuditService,
    PermissionGuard,
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
  exports: [AuthorizationAuditService, PermissionGuard],
})
export class AuthorizationModule {}

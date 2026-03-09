import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { AuditStoreModule } from '../operations/audit/audit-store.module';
import { RequestContextModule } from '../operations/request-context/request-context.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { RolesModule } from '../roles/roles.module';
import { PermissionGuard } from './guards/permission.guard';
import { AuthorizationAuditService } from './services/authorization-audit.service';

@Module({
  imports: [PermissionsModule, RolesModule, AuditStoreModule, RequestContextModule],
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

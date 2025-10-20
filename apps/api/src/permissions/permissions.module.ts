import { Module } from '@nestjs/common';

import { PermissionResolutionService } from './permission-resolution.service';
import { PermissionRepository } from './permissions.repository';
import { PermissionService } from './permissions.service';

@Module({
  providers: [PermissionRepository, PermissionService, PermissionResolutionService],
  exports: [PermissionService, PermissionRepository, PermissionResolutionService],
})
export class PermissionsModule {}

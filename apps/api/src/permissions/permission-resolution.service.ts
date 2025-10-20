import { Injectable } from '@nestjs/common';

import { formatPermissionKey } from '../shared/utils/permission-key.util';
import { PermissionRepository } from './permissions.repository';

@Injectable()
export class PermissionResolutionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async resolveUserPermissions(userId: string): Promise<string[]> {
    const permissions = await this.permissionRepository.findPermissionsForUser(userId);
    const permissionKeys = new Set<string>();

    for (const permission of permissions) {
      permissionKeys.add(formatPermissionKey(permission.resource, permission.action));
    }

    return Array.from(permissionKeys).sort();
  }

  async userHasPermission(userId: string, resource: string, action: string): Promise<boolean> {
    const permissions = await this.resolveUserPermissions(userId);
    return permissions.includes(formatPermissionKey(resource, action));
  }
}

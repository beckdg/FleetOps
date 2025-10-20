import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Permission } from '@prisma/client';

import { formatPermissionKey } from '../shared/utils/permission-key.util';
import { CreatePermissionData, PermissionRepository } from './permissions.repository';

export interface CreatePermissionInput {
  resource: string;
  action: string;
  description?: string;
}

@Injectable()
export class PermissionService {
  constructor(private readonly permissionRepository: PermissionRepository) {}

  async createPermission(input: CreatePermissionInput): Promise<Permission> {
    const data: CreatePermissionData = {
      resource: input.resource,
      action: input.action,
      description: input.description,
    };

    try {
      return await this.permissionRepository.create(data);
    } catch (error) {
      if (this.permissionRepository.isUniqueConstraintError(error)) {
        throw new ConflictException(
          `Permission ${formatPermissionKey(input.resource, input.action)} already exists`,
        );
      }

      throw error;
    }
  }

  async assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    await this.permissionRepository.requireById(permissionId);

    try {
      await this.permissionRepository.assignPermissionToRole(roleId, permissionId);
    } catch (error) {
      if (this.permissionRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('Permission is already assigned to this role');
      }

      throw error;
    }
  }

  async removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    try {
      await this.permissionRepository.removePermissionFromRole(roleId, permissionId);
    } catch (error) {
      if (this.permissionRepository.isNotFoundError(error)) {
        throw new NotFoundException('Permission assignment not found for this role');
      }

      throw error;
    }
  }

  findByResourceAndAction(resource: string, action: string): Promise<Permission | null> {
    return this.permissionRepository.findByResourceAndAction(resource, action);
  }

  findAll(): Promise<Permission[]> {
    return this.permissionRepository.findAll();
  }
}

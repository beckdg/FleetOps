import { Injectable, NotFoundException } from '@nestjs/common';
import { Permission, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreatePermissionData {
  resource: string;
  action: string;
  description?: string;
}

@Injectable()
export class PermissionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreatePermissionData): Promise<Permission> {
    return this.prisma.permission.create({ data });
  }

  findById(id: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({ where: { id } });
  }

  findByResourceAndAction(resource: string, action: string): Promise<Permission | null> {
    return this.prisma.permission.findUnique({
      where: {
        resource_action: { resource, action },
      },
    });
  }

  findManyByIds(ids: string[]): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: { id: { in: ids } },
    });
  }

  findAll(): Promise<Permission[]> {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }

  assignPermissionToRole(roleId: string, permissionId: string): Promise<void> {
    return this.prisma.rolePermission
      .create({
        data: {
          roleId,
          permissionId,
        },
      })
      .then(() => undefined);
  }

  removePermissionFromRole(roleId: string, permissionId: string): Promise<void> {
    return this.prisma.rolePermission
      .delete({
        where: {
          roleId_permissionId: { roleId, permissionId },
        },
      })
      .then(() => undefined);
  }

  findPermissionsForUser(userId: string): Promise<Permission[]> {
    return this.prisma.permission.findMany({
      where: {
        rolePermissions: {
          some: {
            role: {
              userRoles: {
                some: {
                  userId,
                  user: {
                    deletedAt: null,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
      distinct: ['id'],
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });
  }

  requireById(id: string): Promise<Permission> {
    return this.findById(id).then((permission) => {
      if (!permission) {
        throw new NotFoundException(`Permission ${id} not found`);
      }

      return permission;
    });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }
}

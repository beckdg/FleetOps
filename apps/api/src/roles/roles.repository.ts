import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

import { ADMIN_ROLE_NAME } from '../authorization/constants/authorization.constants';
import { PrismaService } from '../database/prisma.service';

export interface CreateRoleData {
  organizationId: string;
  name: string;
  description?: string;
}

@Injectable()
export class RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateRoleData): Promise<Role> {
    return this.prisma.role.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        description: data.description,
      },
    });
  }

  findById(id: string): Promise<Role | null> {
    return this.prisma.role.findUnique({ where: { id } });
  }

  findByName(organizationId: string, name: string): Promise<Role | null> {
    return this.prisma.role.findUnique({
      where: {
        organizationId_name: {
          organizationId,
          name,
        },
      },
    });
  }

  assignRoleToUser(userId: string, roleId: string): Promise<void> {
    return this.prisma.userRole
      .create({
        data: {
          userId,
          roleId,
        },
      })
      .then(() => undefined);
  }

  removeRoleFromUser(userId: string, roleId: string): Promise<void> {
    return this.prisma.userRole
      .delete({
        where: {
          userId_roleId: { userId, roleId },
        },
      })
      .then(() => undefined);
  }

  findRoleIdsByUserId(userId: string): Promise<string[]> {
    return this.prisma.userRole
      .findMany({
        where: { userId },
        select: { roleId: true },
      })
      .then((assignments) => assignments.map((assignment) => assignment.roleId));
  }

  userHasRoleByName(userId: string, organizationId: string, roleName: string): Promise<boolean> {
    return this.prisma.userRole
      .findFirst({
        where: {
          userId,
          role: {
            organizationId,
            name: roleName,
          },
        },
        select: { userId: true },
      })
      .then((assignment) => assignment !== null);
  }

  requireById(id: string): Promise<Role> {
    return this.findById(id).then((role) => {
      if (!role) {
        throw new NotFoundException(`Role ${id} not found`);
      }

      return role;
    });
  }

  requireInOrganization(roleId: string, organizationId: string): Promise<Role> {
    return this.prisma.role.findFirst({ where: { id: roleId, organizationId } }).then((role) => {
      if (!role) {
        throw new NotFoundException(`Role ${roleId} not found in organization ${organizationId}`);
      }

      return role;
    });
  }

  findActiveAdminUserIdsByOrganizationIds(organizationIds: string[]): Promise<Map<string, string>> {
    if (organizationIds.length === 0) {
      return Promise.resolve(new Map());
    }

    return this.prisma.userRole
      .findMany({
        where: {
          role: {
            organizationId: { in: organizationIds },
            name: ADMIN_ROLE_NAME,
          },
          user: {
            organizationId: { in: organizationIds },
            isActive: true,
            deletedAt: null,
          },
        },
        select: {
          user: {
            select: {
              id: true,
              organizationId: true,
            },
          },
        },
        orderBy: [{ assignedAt: 'asc' }],
      })
      .then((assignments) => {
        const recipients = new Map<string, string>();

        for (const assignment of assignments) {
          if (!recipients.has(assignment.user.organizationId)) {
            recipients.set(assignment.user.organizationId, assignment.user.id);
          }
        }

        return recipients;
      });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }
}

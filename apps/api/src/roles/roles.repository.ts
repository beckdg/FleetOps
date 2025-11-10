import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

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
    return this.requireById(roleId).then((role) => {
      if (role.organizationId !== organizationId) {
        throw new NotFoundException(`Role ${roleId} not found in organization ${organizationId}`);
      }

      return role;
    });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }
}

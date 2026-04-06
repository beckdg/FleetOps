import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateUserData {
  organizationId: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
}

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({
      data: {
        organizationId: data.organizationId,
        email: data.email.toLowerCase(),
        passwordHash: data.passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        isActive: data.isActive ?? true,
      },
    });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });
  }

  findByIdIncludingDeleted(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(organizationId: string, email: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        organizationId,
        email: email.toLowerCase(),
        deletedAt: null,
      },
    });
  }

  update(id: string, data: UpdateUserData): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...data,
        email: data.email?.toLowerCase(),
      },
    });
  }

  deactivate(id: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: {
        isActive: false,
        deletedAt: new Date(),
      },
    });
  }

  requireActiveById(id: string): Promise<User> {
    return this.findById(id).then((user) => {
      if (!user) {
        throw new NotFoundException(`User ${id} not found`);
      }

      return user;
    });
  }

  requireActiveInOrganization(userId: string, organizationId: string): Promise<User> {
    return this.requireActiveById(userId).then((user) => {
      if (user.organizationId !== organizationId) {
        throw new NotFoundException(`User ${userId} not found in organization ${organizationId}`);
      }

      return user;
    });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }

  incrementFailedLoginAttempts(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: { increment: 1 },
      },
    });
  }

  recordFailedLoginAttempt(
    userId: string,
    maxAttempts: number,
    lockDurationMinutes: number,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
      });

      if (user.failedLoginAttempts < maxAttempts) {
        return user;
      }

      return tx.user.update({
        where: { id: userId },
        data: {
          lockedUntil: new Date(Date.now() + lockDurationMinutes * 60_000),
        },
      });
    });
  }

  setLockedUntil(userId: string, lockedUntil: Date): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lockedUntil },
    });
  }

  resetLoginLockout(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }
}

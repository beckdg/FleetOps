import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKey } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateApiKeyData {
  organizationId: string;
  name: string;
  keyPrefix: string;
  hashedKey: string;
  expiresAt?: Date;
  createdByUserId: string;
}

@Injectable()
export class ApiKeyRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateApiKeyData): Promise<ApiKey> {
    return this.prisma.apiKey.create({ data });
  }

  findByHashedKey(hashedKey: string): Promise<ApiKey | null> {
    return this.prisma.apiKey.findUnique({ where: { hashedKey } });
  }

  findByOrganization(organizationId: string): Promise<ApiKey[]> {
    return this.prisma.apiKey.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  requireByIdInOrganization(id: string, organizationId: string): Promise<ApiKey> {
    return this.prisma.apiKey.findFirst({ where: { id, organizationId } }).then((apiKey) => {
      if (!apiKey) {
        throw new NotFoundException(`API key ${id} not found`);
      }

      return apiKey;
    });
  }

  revoke(id: string, organizationId: string): Promise<ApiKey> {
    return this.prisma.apiKey
      .updateMany({
        where: { id, organizationId },
        data: { isActive: false },
      })
      .then(async (result) => {
        if (result.count === 0) {
          throw new NotFoundException(`API key ${id} not found`);
        }

        return this.prisma.apiKey.findFirstOrThrow({
          where: { id, organizationId },
        });
      });
  }

  touchLastUsedAt(id: string): Promise<void> {
    return this.prisma.apiKey
      .update({
        where: { id },
        data: { lastUsedAt: new Date() },
      })
      .then(() => undefined);
  }

  isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }

  revokeExpiredKeys(referenceDate: Date): Promise<number> {
    return this.prisma.apiKey
      .updateMany({
        where: {
          isActive: true,
          expiresAt: { lt: referenceDate },
        },
        data: { isActive: false },
      })
      .then((result) => result.count);
  }
}

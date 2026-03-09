import { Injectable } from '@nestjs/common';
import { RefreshToken } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  createRefreshToken(data: CreateRefreshTokenData): Promise<RefreshToken> {
    return this.prisma.refreshToken.create({
      data: {
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
      },
    });
  }

  findValidRefreshTokenByHash(tokenHash: string): Promise<RefreshToken | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  }

  revokeRefreshToken(id: string): Promise<RefreshToken> {
    return this.prisma.refreshToken.update({
      where: { id },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  deleteExpiredRefreshTokens(beforeDate: Date): Promise<number> {
    return this.prisma.refreshToken
      .deleteMany({
        where: {
          OR: [{ expiresAt: { lt: beforeDate } }, { revokedAt: { lt: beforeDate } }],
        },
      })
      .then((result) => result.count);
  }
}

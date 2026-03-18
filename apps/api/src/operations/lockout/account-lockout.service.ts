import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

import { EnvironmentVariables } from '../../shared/constants/env.validation';
import { UserRepository } from '../../users/users.repository';

export interface LockoutEvaluation {
  isLocked: boolean;
  lockedUntil: Date | null;
  failedAttempts: number;
}

@Injectable()
export class AccountLockoutService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  evaluate(user: User | null, referenceDate = new Date()): LockoutEvaluation {
    if (!user) {
      return { isLocked: false, lockedUntil: null, failedAttempts: 0 };
    }

    const lockedUntil = user.lockedUntil;
    const isLocked = lockedUntil !== null && lockedUntil.getTime() > referenceDate.getTime();

    return {
      isLocked,
      lockedUntil,
      failedAttempts: user.failedLoginAttempts,
    };
  }

  async recordFailedAttempt(userId: string): Promise<LockoutEvaluation> {
    const maxAttempts = this.configService.get('ACCOUNT_LOCKOUT_MAX_ATTEMPTS', { infer: true });
    const lockMinutes = this.configService.get('ACCOUNT_LOCKOUT_DURATION_MINUTES', { infer: true });

    const user = await this.userRepository.incrementFailedLoginAttempts(userId);
    const attempts = user.failedLoginAttempts;

    if (attempts >= maxAttempts) {
      const lockedUntil = new Date(Date.now() + lockMinutes * 60_000);
      const lockedUser = await this.userRepository.setLockedUntil(userId, lockedUntil);

      return {
        isLocked: true,
        lockedUntil: lockedUser.lockedUntil,
        failedAttempts: lockedUser.failedLoginAttempts,
      };
    }

    return {
      isLocked: false,
      lockedUntil: user.lockedUntil,
      failedAttempts: attempts,
    };
  }

  async resetAttempts(userId: string): Promise<void> {
    await this.userRepository.resetLoginLockout(userId);
  }
}

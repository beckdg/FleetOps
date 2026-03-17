import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AuthRepository } from '../../auth/auth.repository';
import { ApiKeyRepository } from '../../integrations/api-keys.repository';
import { JobRepository } from '../../queues/jobs.repository';
import { EnvironmentVariables } from '../../shared/constants/env.validation';

export interface CleanupSummary {
  refreshTokensRemoved: number;
  expiredApiKeysRevoked: number;
  completedJobsRemoved: number;
}

@Injectable()
export class DataCleanupService {
  private readonly logger = new Logger(DataCleanupService.name);

  constructor(
    private readonly authRepository: AuthRepository,
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly jobRepository: JobRepository,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async runCleanup(referenceDate = new Date()): Promise<CleanupSummary> {
    const refreshRetentionDays = this.configService.get('REFRESH_TOKEN_RETENTION_DAYS', {
      infer: true,
    });
    const jobRetentionDays = this.configService.get('COMPLETED_JOB_RETENTION_DAYS', {
      infer: true,
    });

    const refreshCutoff = this.subtractDays(referenceDate, refreshRetentionDays);
    const jobCutoff = this.subtractDays(referenceDate, jobRetentionDays);

    const [refreshTokensRemoved, expiredApiKeysRevoked, completedJobsRemoved] = await Promise.all([
      this.authRepository.deleteExpiredRefreshTokens(refreshCutoff),
      this.apiKeyRepository.revokeExpiredKeys(referenceDate),
      this.jobRepository.deleteCompletedBefore(jobCutoff),
    ]);

    const summary = {
      refreshTokensRemoved,
      expiredApiKeysRevoked,
      completedJobsRemoved,
    };

    this.logger.log(JSON.stringify({ event: 'data_cleanup_completed', ...summary }));

    return summary;
  }

  private subtractDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() - days);
    return result;
  }
}

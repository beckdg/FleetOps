import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { DEFAULT_CLEANUP_CRON } from '../constants/operations.constants';
import { DataCleanupService } from './data-cleanup.service';

@Injectable()
export class DataCleanupScheduler {
  private readonly logger = new Logger(DataCleanupScheduler.name);

  constructor(private readonly dataCleanupService: DataCleanupService) {}

  @Cron(DEFAULT_CLEANUP_CRON)
  async runScheduledCleanup(): Promise<void> {
    const summary = await this.dataCleanupService.runCleanup();
    this.logger.log(`Scheduled cleanup completed: ${JSON.stringify(summary)}`);
  }
}

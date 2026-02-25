import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { DAILY_REMINDER_CRON } from '../constants/queue.constants';
import { ReminderGenerationService } from '../reminder-generation.service';

@Injectable()
export class DailyReminderScheduler {
  private readonly logger = new Logger(DailyReminderScheduler.name);

  constructor(private readonly reminderGenerationService: ReminderGenerationService) {}

  @Cron(DAILY_REMINDER_CRON)
  async runDailyReminders(): Promise<void> {
    const licenseJobs = await this.reminderGenerationService.generateLicenseExpiryReminders();
    const maintenanceJobs = await this.reminderGenerationService.generateMaintenanceReminders();

    this.logger.log(
      `Daily reminders enqueued: license=${licenseJobs}, maintenance=${maintenanceJobs}`,
    );
  }
}

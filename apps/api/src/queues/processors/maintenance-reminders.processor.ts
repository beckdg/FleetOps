import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { Job } from 'bullmq';

import { upcomingMaintenanceReminderNotificationContent } from '../../notifications/constants/notification.constants';
import { NotificationService } from '../../notifications/notifications.service';
import { MaintenanceRecordRepository } from '../../maintenance/maintenance-records.repository';
import { MaintenanceReminderJobPayload } from '../constants/job.constants';
import { JOB_MAX_ATTEMPTS, QUEUE_NAMES } from '../constants/queue.constants';
import { JobService } from '../jobs.service';

@Injectable()
@Processor(QUEUE_NAMES.MAINTENANCE_REMINDERS)
export class MaintenanceRemindersProcessor extends WorkerHost {
  constructor(
    private readonly maintenanceRecordRepository: MaintenanceRecordRepository,
    private readonly notificationService: NotificationService,
    private readonly jobService: JobService,
  ) {
    super();
  }

  async process(job: Job<MaintenanceReminderJobPayload>): Promise<void> {
    const attemptNumber = job.attemptsMade + 1;

    await this.jobService.markProcessing(job.data.jobRecordId, attemptNumber);

    try {
      const record = await this.maintenanceRecordRepository.requireInOrganization(
        job.data.maintenanceRecordId,
        job.data.organizationId,
      );

      const content = upcomingMaintenanceReminderNotificationContent(
        record.title,
        record.scheduledAt,
      );

      const notification = await this.notificationService.createNotification({
        organizationId: job.data.organizationId,
        userId: job.data.recipientUserId,
        type: NotificationType.SYSTEM,
        title: content.title,
        message: content.message,
        metadata: {
          maintenanceId: record.id,
          vehicleId: record.vehicleId,
          scheduledAt: record.scheduledAt.toISOString(),
        },
      });

      await this.jobService.markCompleted(job.data.jobRecordId, {
        notificationId: notification?.id ?? null,
        maintenanceRecordId: record.id,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Maintenance reminder failed';

      if (attemptNumber >= JOB_MAX_ATTEMPTS) {
        await this.jobService.markFailed(job.data.jobRecordId, message, attemptNumber);
        return;
      }

      throw error;
    }
  }
}

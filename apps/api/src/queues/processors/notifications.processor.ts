import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { Job } from 'bullmq';

import { NotificationService } from '../../notifications/notifications.service';
import { NotificationJobPayload } from '../constants/job.constants';
import { JOB_MAX_ATTEMPTS, QUEUE_NAMES } from '../constants/queue.constants';
import { JobService } from '../jobs.service';

@Injectable()
@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationsProcessor extends WorkerHost {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly jobService: JobService,
  ) {
    super();
  }

  async process(job: Job<NotificationJobPayload>): Promise<void> {
    const attemptNumber = job.attemptsMade + 1;

    await this.jobService.markProcessing(job.data.jobRecordId, attemptNumber);

    try {
      const notification = await this.notificationService.createNotification({
        organizationId: job.data.organizationId,
        userId: job.data.userId,
        type: job.data.type as NotificationType,
        title: job.data.title,
        message: job.data.message,
        metadata: job.data.metadata,
      });

      await this.jobService.markCompleted(job.data.jobRecordId, {
        notificationId: notification?.id ?? null,
        suppressed: notification === null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Notification job failed';

      if (attemptNumber >= JOB_MAX_ATTEMPTS) {
        await this.jobService.markFailed(job.data.jobRecordId, message, attemptNumber);
        return;
      }

      throw error;
    }
  }
}

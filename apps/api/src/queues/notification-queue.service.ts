import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { $Enums, NotificationType, Prisma } from '@prisma/client';
import type { JobType } from '@prisma/client';
import { Queue } from 'bullmq';

import { NotificationJobPayload } from './constants/job.constants';
import { DEFAULT_QUEUE_JOB_OPTIONS, QUEUE_NAMES } from './constants/queue.constants';
import { JobService } from './jobs.service';

export interface EnqueueNotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  jobType?: Extract<JobType, 'NOTIFICATION' | 'LICENSE_EXPIRY_REMINDER'>;
}

@Injectable()
export class NotificationQueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.NOTIFICATIONS)
    private readonly notificationsQueue: Queue<NotificationJobPayload>,
    private readonly jobService: JobService,
  ) {}

  async enqueueNotification(input: EnqueueNotificationInput): Promise<string> {
    const jobType = input.jobType ?? $Enums.JobType.NOTIFICATION;

    const jobRecord = await this.jobService.createJobRecord({
      organizationId: input.organizationId,
      type: jobType,
      queueName: QUEUE_NAMES.NOTIFICATIONS,
      payload: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: input.metadata,
      } as Prisma.InputJsonValue,
    });

    const bullJob = await this.notificationsQueue.add(
      'notify',
      {
        jobRecordId: jobRecord.id,
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        message: input.message,
        metadata: input.metadata,
      },
      DEFAULT_QUEUE_JOB_OPTIONS,
    );

    await this.jobService.attachBullJobId(jobRecord.id, String(bullJob.id));

    return jobRecord.id;
  }
}

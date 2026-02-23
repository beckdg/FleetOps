import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';

import { MaintenanceReminderJobPayload } from './constants/job.constants';
import { DEFAULT_QUEUE_JOB_OPTIONS, QUEUE_NAMES } from './constants/queue.constants';
import { JobService } from './jobs.service';

@Injectable()
export class MaintenanceReminderQueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.MAINTENANCE_REMINDERS)
    private readonly maintenanceRemindersQueue: Queue<MaintenanceReminderJobPayload>,
    private readonly jobService: JobService,
  ) {}

  async enqueueReminder(input: {
    organizationId: string;
    maintenanceRecordId: string;
    recipientUserId: string;
  }): Promise<string> {
    const jobRecord = await this.jobService.createJobRecord({
      organizationId: input.organizationId,
      type: JobType.MAINTENANCE_REMINDER,
      queueName: QUEUE_NAMES.MAINTENANCE_REMINDERS,
      payload: {
        maintenanceRecordId: input.maintenanceRecordId,
        recipientUserId: input.recipientUserId,
      } as Prisma.InputJsonValue,
    });

    const bullJob = await this.maintenanceRemindersQueue.add(
      'maintenance-reminder',
      {
        jobRecordId: jobRecord.id,
        organizationId: input.organizationId,
        maintenanceRecordId: input.maintenanceRecordId,
        recipientUserId: input.recipientUserId,
      },
      DEFAULT_QUEUE_JOB_OPTIONS,
    );

    await this.jobService.attachBullJobId(jobRecord.id, String(bullJob.id));

    return jobRecord.id;
  }
}

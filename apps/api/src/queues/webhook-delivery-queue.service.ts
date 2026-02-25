import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobType } from '@prisma/client';
import { Queue } from 'bullmq';

import { DEFAULT_QUEUE_JOB_OPTIONS, QUEUE_NAMES } from './constants/queue.constants';
import { WebhookDeliveryJobPayload } from './constants/job.constants';
import { JobService } from './jobs.service';

@Injectable()
export class WebhookDeliveryQueueService {
  constructor(
    @InjectQueue(QUEUE_NAMES.WEBHOOK_DELIVERY)
    private readonly webhookDeliveryQueue: Queue<WebhookDeliveryJobPayload>,
    private readonly jobService: JobService,
  ) {}

  async enqueueDelivery(input: {
    organizationId: string;
    webhookEndpointId: string;
    webhookEventId: string;
  }): Promise<{ jobRecordId: string; bullJobId: string | undefined }> {
    const jobRecord = await this.jobService.createJobRecord({
      organizationId: input.organizationId,
      type: JobType.WEBHOOK_DELIVERY,
      queueName: QUEUE_NAMES.WEBHOOK_DELIVERY,
      payload: {
        webhookEndpointId: input.webhookEndpointId,
        webhookEventId: input.webhookEventId,
      },
    });

    const bullJob = await this.webhookDeliveryQueue.add(
      'deliver',
      {
        jobRecordId: jobRecord.id,
        organizationId: input.organizationId,
        webhookEndpointId: input.webhookEndpointId,
        webhookEventId: input.webhookEventId,
      },
      DEFAULT_QUEUE_JOB_OPTIONS,
    );

    await this.jobService.attachBullJobId(jobRecord.id, String(bullJob.id));

    return {
      jobRecordId: jobRecord.id,
      bullJobId: bullJob.id ? String(bullJob.id) : undefined,
    };
  }
}

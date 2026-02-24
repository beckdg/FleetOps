import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Job } from 'bullmq';

import { WebhookDeliveryService } from '../../integrations/webhook-delivery.service';
import { JOB_MAX_ATTEMPTS, QUEUE_NAMES } from '../constants/queue.constants';
import { WebhookDeliveryJobPayload } from '../constants/job.constants';
import { JobService } from '../jobs.service';

@Injectable()
@Processor(QUEUE_NAMES.WEBHOOK_DELIVERY)
export class WebhookDeliveryProcessor extends WorkerHost {
  constructor(
    private readonly webhookDeliveryService: WebhookDeliveryService,
    private readonly jobService: JobService,
  ) {
    super();
  }

  async process(job: Job<WebhookDeliveryJobPayload>): Promise<void> {
    const attemptNumber = job.attemptsMade + 1;

    await this.jobService.markProcessing(job.data.jobRecordId, attemptNumber);

    const result = await this.webhookDeliveryService.deliverEvent(
      job.data.webhookEndpointId,
      job.data.webhookEventId,
      attemptNumber,
    );

    if (result.success) {
      await this.jobService.markCompleted(job.data.jobRecordId, {
        deliveryId: result.delivery.id,
        status: result.delivery.status,
      });
      return;
    }

    if (attemptNumber >= JOB_MAX_ATTEMPTS) {
      await this.jobService.markFailed(
        job.data.jobRecordId,
        result.delivery.responseBody ?? 'Webhook delivery failed',
        attemptNumber,
      );
      return;
    }

    throw new Error(result.delivery.responseBody ?? 'Webhook delivery failed');
  }
}

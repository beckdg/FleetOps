import { Injectable } from '@nestjs/common';
import { Prisma, WebhookEvent } from '@prisma/client';

import { WebhookEventType } from './constants/integrations.constants';
import { WebhookDeliveryQueueService } from '../queues/webhook-delivery-queue.service';
import { WebhookDeliveryRepository } from './webhook-deliveries.repository';
import { WebhookEndpointRepository } from './webhook-endpoints.repository';
import { WebhookEventRepository } from './webhook-events.repository';

@Injectable()
export class WebhookPublisherService {
  constructor(
    private readonly webhookEventRepository: WebhookEventRepository,
    private readonly webhookEndpointRepository: WebhookEndpointRepository,
    private readonly webhookDeliveryQueueService: WebhookDeliveryQueueService,
    private readonly webhookDeliveryRepository: WebhookDeliveryRepository,
  ) {}

  async publish(
    organizationId: string,
    eventType: WebhookEventType,
    payload: Record<string, unknown>,
  ): Promise<WebhookEvent> {
    const event = await this.webhookEventRepository.create({
      organizationId,
      eventType,
      payload: payload as Prisma.InputJsonValue,
    });

    const endpoints = await this.webhookEndpointRepository.findActiveByOrganization(organizationId);

    await Promise.all(
      endpoints.map((endpoint) =>
        this.webhookDeliveryQueueService.enqueueDelivery({
          organizationId,
          webhookEndpointId: endpoint.id,
          webhookEventId: event.id,
        }),
      ),
    );

    return event;
  }

  async listDeliveries(
    organizationId: string,
    filters?: { webhookEndpointId?: string; webhookEventId?: string },
  ) {
    return this.webhookDeliveryRepository.findByOrganization(organizationId, filters);
  }
}

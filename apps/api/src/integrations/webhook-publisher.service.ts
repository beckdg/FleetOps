import { Injectable } from '@nestjs/common';
import { Prisma, WebhookEvent } from '@prisma/client';

import { WebhookEventType } from './constants/integrations.constants';
import { WebhookDeliveryRepository } from './webhook-deliveries.repository';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookEndpointRepository } from './webhook-endpoints.repository';
import { WebhookEventRepository } from './webhook-events.repository';

@Injectable()
export class WebhookPublisherService {
  constructor(
    private readonly webhookEventRepository: WebhookEventRepository,
    private readonly webhookEndpointRepository: WebhookEndpointRepository,
    private readonly webhookDeliveryService: WebhookDeliveryService,
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
        this.webhookDeliveryService.deliverWithRetries(endpoint.id, event.id),
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

import { Inject, Injectable } from '@nestjs/common';
import { WebhookDelivery, WebhookDeliveryStatus } from '@prisma/client';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { isFinalFailedAttempt, shouldRetryDelivery } from './constants/webhook-retry.constants';
import { WEBHOOK_SIGNATURE_HEADER } from './constants/integrations.constants';
import { WEBHOOK_HTTP_CLIENT, WebhookHttpClient } from './interfaces/webhook-http-client.interface';
import { WebhookDeliveryRepository } from './webhook-deliveries.repository';
import { WebhookEndpointRepository } from './webhook-endpoints.repository';
import { WebhookEventRepository } from './webhook-events.repository';
import {
  buildWebhookSignatureHeader,
  WebhookSignaturePayload,
} from './utils/webhook-signature.util';

export interface DeliveryAttemptResult {
  delivery: WebhookDelivery;
  success: boolean;
  shouldRetry: boolean;
}

@Injectable()
export class WebhookDeliveryService {
  constructor(
    private readonly webhookDeliveryRepository: WebhookDeliveryRepository,
    private readonly webhookEndpointRepository: WebhookEndpointRepository,
    private readonly webhookEventRepository: WebhookEventRepository,
    private readonly fleetAuditService: FleetAuditService,
    @Inject(WEBHOOK_HTTP_CLIENT)
    private readonly webhookHttpClient: WebhookHttpClient,
  ) {}

  async deliverEvent(
    webhookEndpointId: string,
    webhookEventId: string,
    attemptNumber = 1,
  ): Promise<DeliveryAttemptResult> {
    const [endpoint, event] = await Promise.all([
      this.webhookEndpointRepository.requireById(webhookEndpointId),
      this.webhookEventRepository.requireById(webhookEventId),
    ]);

    if (!endpoint.isActive) {
      const delivery = await this.webhookDeliveryRepository.create({
        webhookEndpointId,
        webhookEventId,
        attemptNumber,
        status: WebhookDeliveryStatus.FAILED,
        responseBody: 'Webhook endpoint is inactive',
        deliveredAt: new Date(),
      });

      return {
        delivery,
        success: false,
        shouldRetry: false,
      };
    }

    const pendingDelivery = await this.webhookDeliveryRepository.create({
      webhookEndpointId,
      webhookEventId,
      attemptNumber,
      status: WebhookDeliveryStatus.PENDING,
    });

    const payload = this.buildSignaturePayload(
      event.id,
      event.eventType,
      event.organizationId,
      event.payload,
    );
    const { body, header } = buildWebhookSignatureHeader(endpoint.secret, payload);

    try {
      const response = await this.webhookHttpClient.post(
        endpoint.url,
        {
          [WEBHOOK_SIGNATURE_HEADER]: header,
        },
        body,
      );

      const success = response.statusCode >= 200 && response.statusCode < 300;

      const delivery = await this.recordResult(pendingDelivery.id, {
        success,
        responseCode: response.statusCode,
        responseBody: response.body,
        organizationId: endpoint.organizationId,
        webhookEndpointId: endpoint.id,
        webhookEventId: event.id,
        attemptNumber,
      });

      return {
        delivery,
        success,
        shouldRetry: !success && shouldRetryDelivery(attemptNumber),
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Webhook delivery failed';

      const delivery = await this.recordResult(pendingDelivery.id, {
        success: false,
        responseBody: message,
        organizationId: endpoint.organizationId,
        webhookEndpointId: endpoint.id,
        webhookEventId: event.id,
        attemptNumber,
      });

      return {
        delivery,
        success: false,
        shouldRetry: shouldRetryDelivery(attemptNumber),
      };
    }
  }

  async retryDelivery(
    webhookEndpointId: string,
    webhookEventId: string,
  ): Promise<DeliveryAttemptResult | null> {
    const latestDelivery = await this.webhookDeliveryRepository.findLatestByEndpointAndEvent(
      webhookEndpointId,
      webhookEventId,
    );

    if (!latestDelivery || latestDelivery.status === WebhookDeliveryStatus.SUCCESS) {
      return null;
    }

    if (isFinalFailedAttempt(latestDelivery.attemptNumber)) {
      return {
        delivery: latestDelivery,
        success: false,
        shouldRetry: false,
      };
    }

    return this.deliverEvent(webhookEndpointId, webhookEventId, latestDelivery.attemptNumber + 1);
  }

  async recordResult(
    deliveryId: string,
    input: {
      success: boolean;
      responseCode?: number;
      responseBody?: string;
      organizationId: string;
      webhookEndpointId: string;
      webhookEventId: string;
      attemptNumber: number;
    },
  ): Promise<WebhookDelivery> {
    const status = input.success ? WebhookDeliveryStatus.SUCCESS : WebhookDeliveryStatus.FAILED;

    const delivery = await this.webhookDeliveryRepository.updateResult(deliveryId, {
      status,
      responseCode: input.responseCode,
      responseBody: input.responseBody,
      deliveredAt: new Date(),
    });

    if (input.success) {
      this.fleetAuditService.logWebhookDeliverySuccess({
        organizationId: input.organizationId,
        webhookEndpointId: input.webhookEndpointId,
        webhookEventId: input.webhookEventId,
        deliveryId: delivery.id,
        attemptNumber: input.attemptNumber,
      });
    } else if (isFinalFailedAttempt(input.attemptNumber)) {
      this.fleetAuditService.logWebhookDeliveryFailed({
        organizationId: input.organizationId,
        webhookEndpointId: input.webhookEndpointId,
        webhookEventId: input.webhookEventId,
        deliveryId: delivery.id,
        attemptNumber: input.attemptNumber,
      });
    }

    return delivery;
  }

  async deliverWithRetries(
    webhookEndpointId: string,
    webhookEventId: string,
  ): Promise<WebhookDelivery> {
    let attempt = await this.deliverEvent(webhookEndpointId, webhookEventId, 1);

    while (attempt.shouldRetry) {
      attempt = (await this.retryDelivery(webhookEndpointId, webhookEventId)) ?? attempt;
    }

    return attempt.delivery;
  }

  private buildSignaturePayload(
    eventId: string,
    eventType: string,
    organizationId: string,
    payload: unknown,
  ): WebhookSignaturePayload {
    const data =
      typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)
        : { value: payload };

    return {
      eventId,
      eventType,
      organizationId,
      occurredAt: new Date().toISOString(),
      data,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { WebhookDelivery, WebhookDeliveryStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateWebhookDeliveryData {
  webhookEndpointId: string;
  webhookEventId: string;
  attemptNumber: number;
  status: WebhookDeliveryStatus;
  responseCode?: number;
  responseBody?: string;
  deliveredAt?: Date;
}

export interface UpdateWebhookDeliveryResultData {
  status: WebhookDeliveryStatus;
  responseCode?: number;
  responseBody?: string;
  deliveredAt?: Date;
}

@Injectable()
export class WebhookDeliveryRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateWebhookDeliveryData): Promise<WebhookDelivery> {
    return this.prisma.webhookDelivery.create({ data });
  }

  updateResult(id: string, data: UpdateWebhookDeliveryResultData): Promise<WebhookDelivery> {
    return this.prisma.webhookDelivery.update({
      where: { id },
      data,
    });
  }

  findByOrganization(
    organizationId: string,
    options?: { webhookEndpointId?: string; webhookEventId?: string },
  ): Promise<WebhookDelivery[]> {
    return this.prisma.webhookDelivery.findMany({
      where: {
        ...(options?.webhookEndpointId ? { webhookEndpointId: options.webhookEndpointId } : {}),
        ...(options?.webhookEventId ? { webhookEventId: options.webhookEventId } : {}),
        webhookEndpoint: { organizationId },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findLatestByEndpointAndEvent(
    webhookEndpointId: string,
    webhookEventId: string,
  ): Promise<WebhookDelivery | null> {
    return this.prisma.webhookDelivery.findFirst({
      where: { webhookEndpointId, webhookEventId },
      orderBy: [{ attemptNumber: 'desc' }],
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WebhookEvent } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateWebhookEventData {
  organizationId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
}

@Injectable()
export class WebhookEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateWebhookEventData): Promise<WebhookEvent> {
    return this.prisma.webhookEvent.create({ data });
  }

  requireById(id: string): Promise<WebhookEvent> {
    return this.prisma.webhookEvent.findUnique({ where: { id } }).then((event) => {
      if (!event) {
        throw new NotFoundException(`Webhook event ${id} not found`);
      }

      return event;
    });
  }

  requireByIdInOrganization(id: string, organizationId: string): Promise<WebhookEvent> {
    return this.prisma.webhookEvent.findFirst({ where: { id, organizationId } }).then((event) => {
      if (!event) {
        throw new NotFoundException(`Webhook event ${id} not found`);
      }

      return event;
    });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { WebhookEndpoint } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateWebhookEndpointData {
  organizationId: string;
  name: string;
  url: string;
  secret: string;
}

export interface UpdateWebhookEndpointData {
  name?: string;
  url?: string;
  secret?: string;
  isActive?: boolean;
}

@Injectable()
export class WebhookEndpointRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateWebhookEndpointData): Promise<WebhookEndpoint> {
    return this.prisma.webhookEndpoint.create({ data });
  }

  findByOrganization(organizationId: string): Promise<WebhookEndpoint[]> {
    return this.prisma.webhookEndpoint.findMany({
      where: { organizationId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findActiveByOrganization(organizationId: string): Promise<WebhookEndpoint[]> {
    return this.prisma.webhookEndpoint.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  requireByIdInOrganization(id: string, organizationId: string): Promise<WebhookEndpoint> {
    return this.prisma.webhookEndpoint
      .findFirst({ where: { id, organizationId } })
      .then((endpoint) => {
        if (!endpoint) {
          throw new NotFoundException(`Webhook endpoint ${id} not found`);
        }

        return endpoint;
      });
  }

  requireById(id: string): Promise<WebhookEndpoint> {
    return this.prisma.webhookEndpoint.findUnique({ where: { id } }).then((endpoint) => {
      if (!endpoint) {
        throw new NotFoundException(`Webhook endpoint ${id} not found`);
      }

      return endpoint;
    });
  }

  update(
    id: string,
    organizationId: string,
    data: UpdateWebhookEndpointData,
  ): Promise<WebhookEndpoint> {
    return this.requireByIdInOrganization(id, organizationId).then(() =>
      this.prisma.webhookEndpoint.update({
        where: { id },
        data,
      }),
    );
  }

  isUniqueConstraintError(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    );
  }
}

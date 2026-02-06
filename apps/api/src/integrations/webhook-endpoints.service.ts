import { randomBytes } from 'crypto';

import { ConflictException, Injectable } from '@nestjs/common';
import { WebhookEndpoint } from '@prisma/client';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { UserRepository } from '../users/users.repository';
import {
  UpdateWebhookEndpointData,
  WebhookEndpointRepository,
} from './webhook-endpoints.repository';

export interface CreateWebhookEndpointInput {
  organizationId: string;
  name: string;
  url: string;
  createdByUserId: string;
}

export interface UpdateWebhookEndpointInput {
  organizationId: string;
  webhookId: string;
  name?: string;
  url?: string;
  isActive?: boolean;
  updatedByUserId: string;
}

@Injectable()
export class WebhookEndpointService {
  constructor(
    private readonly webhookEndpointRepository: WebhookEndpointRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly fleetAuditService: FleetAuditService,
  ) {}

  async createWebhookEndpoint(input: CreateWebhookEndpointInput): Promise<WebhookEndpoint> {
    await this.organizationRepository.requireById(input.organizationId);
    await this.userRepository.requireActiveInOrganization(
      input.createdByUserId,
      input.organizationId,
    );

    const secret = randomBytes(32).toString('hex');

    try {
      const endpoint = await this.webhookEndpointRepository.create({
        organizationId: input.organizationId,
        name: input.name,
        url: input.url,
        secret,
      });

      this.fleetAuditService.logWebhookCreated({
        organizationId: endpoint.organizationId,
        webhookEndpointId: endpoint.id,
        name: endpoint.name,
        createdByUserId: input.createdByUserId,
      });

      return endpoint;
    } catch (error) {
      if (this.webhookEndpointRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('A webhook endpoint with this name already exists');
      }

      throw error;
    }
  }

  async listWebhookEndpoints(organizationId: string): Promise<WebhookEndpoint[]> {
    await this.organizationRepository.requireById(organizationId);
    return this.webhookEndpointRepository.findByOrganization(organizationId);
  }

  async updateWebhookEndpoint(input: UpdateWebhookEndpointInput): Promise<WebhookEndpoint> {
    await this.userRepository.requireActiveInOrganization(
      input.updatedByUserId,
      input.organizationId,
    );

    const data: UpdateWebhookEndpointData = {};

    if (input.name !== undefined) {
      data.name = input.name;
    }

    if (input.url !== undefined) {
      data.url = input.url;
    }

    if (input.isActive !== undefined) {
      data.isActive = input.isActive;
    }

    try {
      const endpoint = await this.webhookEndpointRepository.update(
        input.webhookId,
        input.organizationId,
        data,
      );

      this.fleetAuditService.logWebhookUpdated({
        organizationId: endpoint.organizationId,
        webhookEndpointId: endpoint.id,
        updatedByUserId: input.updatedByUserId,
      });

      return endpoint;
    } catch (error) {
      if (this.webhookEndpointRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('A webhook endpoint with this name already exists');
      }

      throw error;
    }
  }
}

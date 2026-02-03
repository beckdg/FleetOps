import { ConflictException, Injectable } from '@nestjs/common';
import { ApiKey } from '@prisma/client';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { UserRepository } from '../users/users.repository';
import { ApiKeyRepository } from './api-keys.repository';
import { generateApiKey } from './utils/api-key.util';

export interface CreateApiKeyInput {
  organizationId: string;
  name: string;
  expiresAt?: string;
  createdByUserId: string;
}

export interface ApiKeyCreatedResult {
  apiKey: ApiKey;
  plaintextKey: string;
}

@Injectable()
export class ApiKeyService {
  constructor(
    private readonly apiKeyRepository: ApiKeyRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly fleetAuditService: FleetAuditService,
  ) {}

  async createApiKey(input: CreateApiKeyInput): Promise<ApiKeyCreatedResult> {
    await this.organizationRepository.requireById(input.organizationId);
    await this.userRepository.requireActiveInOrganization(
      input.createdByUserId,
      input.organizationId,
    );

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : undefined;

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      throw new ConflictException('Invalid expiration date');
    }

    const generated = generateApiKey();

    try {
      const apiKey = await this.apiKeyRepository.create({
        organizationId: input.organizationId,
        name: input.name,
        keyPrefix: generated.keyPrefix,
        hashedKey: generated.hashedKey,
        expiresAt,
        createdByUserId: input.createdByUserId,
      });

      this.fleetAuditService.logApiKeyCreated({
        organizationId: apiKey.organizationId,
        apiKeyId: apiKey.id,
        name: apiKey.name,
        createdByUserId: input.createdByUserId,
      });

      return {
        apiKey,
        plaintextKey: generated.plaintextKey,
      };
    } catch (error) {
      if (this.apiKeyRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('An API key with this name already exists');
      }

      throw error;
    }
  }

  async listApiKeys(organizationId: string): Promise<ApiKey[]> {
    await this.organizationRepository.requireById(organizationId);
    return this.apiKeyRepository.findByOrganization(organizationId);
  }

  async revokeApiKey(
    organizationId: string,
    apiKeyId: string,
    revokedByUserId: string,
  ): Promise<ApiKey> {
    await this.userRepository.requireActiveInOrganization(revokedByUserId, organizationId);
    const apiKey = await this.apiKeyRepository.requireByIdInOrganization(apiKeyId, organizationId);

    if (!apiKey.isActive) {
      return apiKey;
    }

    const revoked = await this.apiKeyRepository.revoke(apiKeyId, organizationId);

    this.fleetAuditService.logApiKeyRevoked({
      organizationId: revoked.organizationId,
      apiKeyId: revoked.id,
      revokedByUserId,
    });

    return revoked;
  }
}

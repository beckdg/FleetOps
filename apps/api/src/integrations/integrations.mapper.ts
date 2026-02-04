import { ApiKey, WebhookDelivery, WebhookEndpoint } from '@prisma/client';

import {
  ApiKeyCreatedResponseDto,
  ApiKeyResponseDto,
  WebhookDeliveryResponseDto,
  WebhookEndpointResponseDto,
} from './dto/integrations-response.dto';

export function toApiKeyResponse(apiKey: ApiKey): ApiKeyResponseDto {
  return {
    id: apiKey.id,
    organizationId: apiKey.organizationId,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    lastUsedAt: apiKey.lastUsedAt?.toISOString() ?? null,
    expiresAt: apiKey.expiresAt?.toISOString() ?? null,
    isActive: apiKey.isActive,
    createdByUserId: apiKey.createdByUserId,
    createdAt: apiKey.createdAt.toISOString(),
    updatedAt: apiKey.updatedAt.toISOString(),
  };
}

export function toApiKeyCreatedResponse(
  apiKey: ApiKey,
  plaintextKey: string,
): ApiKeyCreatedResponseDto {
  return {
    ...toApiKeyResponse(apiKey),
    plaintextKey,
  };
}

export function toWebhookEndpointResponse(endpoint: WebhookEndpoint): WebhookEndpointResponseDto {
  return {
    id: endpoint.id,
    organizationId: endpoint.organizationId,
    name: endpoint.name,
    url: endpoint.url,
    secret: endpoint.secret,
    isActive: endpoint.isActive,
    createdAt: endpoint.createdAt.toISOString(),
    updatedAt: endpoint.updatedAt.toISOString(),
  };
}

export function toWebhookDeliveryResponse(delivery: WebhookDelivery): WebhookDeliveryResponseDto {
  return {
    id: delivery.id,
    webhookEndpointId: delivery.webhookEndpointId,
    webhookEventId: delivery.webhookEventId,
    attemptNumber: delivery.attemptNumber,
    status: delivery.status,
    responseCode: delivery.responseCode,
    responseBody: delivery.responseBody,
    deliveredAt: delivery.deliveredAt?.toISOString() ?? null,
    createdAt: delivery.createdAt.toISOString(),
  };
}

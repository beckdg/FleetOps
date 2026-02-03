import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { RequirePermission } from '../authorization/decorators/require-permission.decorator';
import { Public } from '../shared/decorators/public.decorator';
import { ApiKeyService } from './api-keys.service';
import { CurrentApiKey } from './decorators/current-api-key.decorator';
import {
  CreateApiKeyDto,
  CreateWebhookEndpointDto,
  UpdateWebhookEndpointDto,
} from './dto/integrations.dto';
import {
  ApiKeyContextResponseDto,
  ApiKeyCreatedResponseDto,
  ApiKeyResponseDto,
  WebhookDeliveryResponseDto,
  WebhookEndpointResponseDto,
} from './dto/integrations-response.dto';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiKeyContext } from './interfaces/api-key-context.interface';
import {
  toApiKeyCreatedResponse,
  toApiKeyResponse,
  toWebhookDeliveryResponse,
  toWebhookEndpointResponse,
} from './integrations.mapper';
import { WebhookEndpointService } from './webhook-endpoints.service';
import { WebhookPublisherService } from './webhook-publisher.service';

@ApiTags('Integrations')
@Controller()
export class IntegrationsController {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly webhookEndpointService: WebhookEndpointService,
    private readonly webhookPublisherService: WebhookPublisherService,
  ) {}

  @Post('api-keys')
  @ApiBearerAuth()
  @RequirePermission('integrations', 'write')
  @ApiOperation({ summary: 'Create an organization API key' })
  @ApiCreatedResponse({ type: ApiKeyCreatedResponseDto })
  createApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateApiKeyDto,
  ): Promise<ApiKeyCreatedResponseDto> {
    return this.apiKeyService
      .createApiKey({
        organizationId: user.organizationId,
        createdByUserId: user.userId,
        ...dto,
      })
      .then(({ apiKey, plaintextKey }) => toApiKeyCreatedResponse(apiKey, plaintextKey));
  }

  @Get('api-keys')
  @ApiBearerAuth()
  @RequirePermission('integrations', 'read')
  @ApiOperation({ summary: 'List organization API keys' })
  @ApiOkResponse({ type: ApiKeyResponseDto, isArray: true })
  listApiKeys(@CurrentUser() user: AuthenticatedUser): Promise<ApiKeyResponseDto[]> {
    return this.apiKeyService
      .listApiKeys(user.organizationId)
      .then((keys) => keys.map(toApiKeyResponse));
  }

  @Delete('api-keys/:id')
  @ApiBearerAuth()
  @RequirePermission('integrations', 'write')
  @ApiOperation({ summary: 'Revoke an organization API key' })
  @ApiOkResponse({ type: ApiKeyResponseDto })
  revokeApiKey(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiKeyResponseDto> {
    return this.apiKeyService
      .revokeApiKey(user.organizationId, id, user.userId)
      .then(toApiKeyResponse);
  }

  @Post('webhooks')
  @ApiBearerAuth()
  @RequirePermission('integrations', 'write')
  @ApiOperation({ summary: 'Create a webhook endpoint' })
  @ApiCreatedResponse({ type: WebhookEndpointResponseDto })
  createWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateWebhookEndpointDto,
  ): Promise<WebhookEndpointResponseDto> {
    return this.webhookEndpointService
      .createWebhookEndpoint({
        organizationId: user.organizationId,
        createdByUserId: user.userId,
        ...dto,
      })
      .then(toWebhookEndpointResponse);
  }

  @Get('webhooks')
  @ApiBearerAuth()
  @RequirePermission('integrations', 'read')
  @ApiOperation({ summary: 'List webhook endpoints' })
  @ApiOkResponse({ type: WebhookEndpointResponseDto, isArray: true })
  listWebhooks(@CurrentUser() user: AuthenticatedUser): Promise<WebhookEndpointResponseDto[]> {
    return this.webhookEndpointService
      .listWebhookEndpoints(user.organizationId)
      .then((endpoints) => endpoints.map(toWebhookEndpointResponse));
  }

  @Patch('webhooks/:id')
  @ApiBearerAuth()
  @RequirePermission('integrations', 'write')
  @ApiOperation({ summary: 'Update a webhook endpoint' })
  @ApiOkResponse({ type: WebhookEndpointResponseDto })
  updateWebhook(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebhookEndpointDto,
  ): Promise<WebhookEndpointResponseDto> {
    return this.webhookEndpointService
      .updateWebhookEndpoint({
        organizationId: user.organizationId,
        webhookId: id,
        updatedByUserId: user.userId,
        ...dto,
      })
      .then(toWebhookEndpointResponse);
  }

  @Get('webhook-deliveries')
  @ApiBearerAuth()
  @RequirePermission('integrations', 'read')
  @ApiOperation({ summary: 'List webhook delivery attempts' })
  @ApiOkResponse({ type: WebhookDeliveryResponseDto, isArray: true })
  listWebhookDeliveries(
    @CurrentUser() user: AuthenticatedUser,
    @Query('webhookEndpointId') webhookEndpointId?: string,
    @Query('webhookEventId') webhookEventId?: string,
  ): Promise<WebhookDeliveryResponseDto[]> {
    return this.webhookPublisherService
      .listDeliveries(user.organizationId, { webhookEndpointId, webhookEventId })
      .then((deliveries) => deliveries.map(toWebhookDeliveryResponse));
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Get('integrations/context')
  @ApiOperation({ summary: 'Resolve organization context from an API key' })
  @ApiOkResponse({ type: ApiKeyContextResponseDto })
  getApiKeyContext(@CurrentApiKey() context: ApiKeyContext): ApiKeyContextResponseDto {
    return context;
  }
}

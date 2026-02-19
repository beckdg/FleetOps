import { Module, forwardRef } from '@nestjs/common';

import { FleetModule } from '../fleet/fleet.module';
import { QueueModule } from '../queues/queue.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { UsersModule } from '../users/users.module';
import { ApiKeyRepository } from './api-keys.repository';
import { ApiKeyService } from './api-keys.service';
import { FetchWebhookHttpClient } from './fetch-webhook-http.client';
import { ApiKeyGuard } from './guards/api-key.guard';
import { WEBHOOK_HTTP_CLIENT } from './interfaces/webhook-http-client.interface';
import { IntegrationsController } from './integrations.controller';
import { WebhookDeliveryRepository } from './webhook-deliveries.repository';
import { WebhookDeliveryService } from './webhook-delivery.service';
import { WebhookEndpointRepository } from './webhook-endpoints.repository';
import { WebhookEndpointService } from './webhook-endpoints.service';
import { WebhookEventRepository } from './webhook-events.repository';
import { WebhookPublisherService } from './webhook-publisher.service';

@Module({
  imports: [OrganizationsModule, UsersModule, FleetModule, forwardRef(() => QueueModule)],
  controllers: [IntegrationsController],
  providers: [
    ApiKeyRepository,
    WebhookEndpointRepository,
    WebhookEventRepository,
    WebhookDeliveryRepository,
    ApiKeyService,
    WebhookEndpointService,
    WebhookDeliveryService,
    WebhookPublisherService,
    ApiKeyGuard,
    FetchWebhookHttpClient,
    {
      provide: WEBHOOK_HTTP_CLIENT,
      useExisting: FetchWebhookHttpClient,
    },
  ],
  exports: [
    WebhookPublisherService,
    WebhookDeliveryService,
    ApiKeyService,
    ApiKeyGuard,
    ApiKeyRepository,
  ],
})
export class IntegrationsModule {}

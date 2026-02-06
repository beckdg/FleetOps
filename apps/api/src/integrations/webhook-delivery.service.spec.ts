import { WebhookDeliveryStatus } from '@prisma/client';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { WebhookDeliveryService } from './webhook-delivery.service';

describe('WebhookDeliveryService', () => {
  const webhookDeliveryRepository = {
    create: jest.fn(),
    updateResult: jest.fn(),
    findLatestByEndpointAndEvent: jest.fn(),
  };
  const webhookEndpointRepository = {
    requireById: jest.fn(),
  };
  const webhookEventRepository = {
    requireById: jest.fn(),
  };
  const fleetAuditService = {
    logWebhookDeliverySuccess: jest.fn(),
    logWebhookDeliveryFailed: jest.fn(),
  } as unknown as FleetAuditService;
  const webhookHttpClient = {
    post: jest.fn(),
  };

  let service: WebhookDeliveryService;

  beforeEach(() => {
    jest.clearAllMocks();

    service = new WebhookDeliveryService(
      webhookDeliveryRepository as never,
      webhookEndpointRepository as never,
      webhookEventRepository as never,
      fleetAuditService,
      webhookHttpClient,
    );
  });

  it('records successful delivery results', async () => {
    webhookDeliveryRepository.updateResult.mockResolvedValue({
      id: 'delivery-1',
      status: WebhookDeliveryStatus.SUCCESS,
    });

    const delivery = await service.recordResult('delivery-1', {
      success: true,
      responseCode: 200,
      responseBody: 'ok',
      organizationId: 'org-1',
      webhookEndpointId: 'endpoint-1',
      webhookEventId: 'event-1',
      attemptNumber: 1,
    });

    expect(delivery.status).toBe(WebhookDeliveryStatus.SUCCESS);
    expect(fleetAuditService.logWebhookDeliverySuccess).toHaveBeenCalled();
  });

  it('audits final failed delivery attempts', async () => {
    webhookDeliveryRepository.updateResult.mockResolvedValue({
      id: 'delivery-3',
      status: WebhookDeliveryStatus.FAILED,
    });

    await service.recordResult('delivery-3', {
      success: false,
      responseCode: 500,
      responseBody: 'error',
      organizationId: 'org-1',
      webhookEndpointId: 'endpoint-1',
      webhookEventId: 'event-1',
      attemptNumber: 3,
    });

    expect(fleetAuditService.logWebhookDeliveryFailed).toHaveBeenCalled();
  });

  it('retries failed deliveries until the final attempt', async () => {
    webhookDeliveryRepository.findLatestByEndpointAndEvent.mockResolvedValue({
      id: 'delivery-1',
      attemptNumber: 1,
      status: WebhookDeliveryStatus.FAILED,
    });

    webhookEndpointRepository.requireById.mockResolvedValue({
      id: 'endpoint-1',
      organizationId: 'org-1',
      url: 'https://example.com/hook',
      secret: 'secret',
      isActive: true,
    });
    webhookEventRepository.requireById.mockResolvedValue({
      id: 'event-1',
      organizationId: 'org-1',
      eventType: 'trip.created',
      payload: { tripId: 'trip-1' },
    });
    webhookDeliveryRepository.create.mockResolvedValue({ id: 'delivery-2' });
    webhookDeliveryRepository.updateResult.mockResolvedValue({
      id: 'delivery-2',
      status: WebhookDeliveryStatus.SUCCESS,
    });
    webhookHttpClient.post.mockResolvedValue({ statusCode: 200, body: 'ok' });

    const result = await service.retryDelivery('endpoint-1', 'event-1');

    expect(result?.success).toBe(true);
    expect(webhookDeliveryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ attemptNumber: 2 }),
    );
  });
});

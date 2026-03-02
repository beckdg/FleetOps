import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JobStatus, JobType, WebhookDeliveryStatus } from '@prisma/client';

import { ApiKeyService } from '../../src/integrations/api-keys.service';
import { ApiKeyGuard } from '../../src/integrations/guards/api-key.guard';
import { WEBHOOK_HTTP_CLIENT } from '../../src/integrations/interfaces/webhook-http-client.interface';
import { WEBHOOK_EVENT_TYPES } from '../../src/integrations/constants/integrations.constants';
import { WebhookDeliveryService } from '../../src/integrations/webhook-delivery.service';
import { WebhookEndpointService } from '../../src/integrations/webhook-endpoints.service';
import { WebhookPublisherService } from '../../src/integrations/webhook-publisher.service';
import { OrganizationService } from '../../src/organizations/organizations.service';
import { PrismaService } from '../../src/database/prisma.service';
import { TripService } from '../../src/trips/trips.service';
import { UserService } from '../../src/users/users.service';
import { VehicleAssignmentService } from '../../src/vehicle-assignments/vehicle-assignments.service';
import { VehicleService } from '../../src/vehicles/vehicles.service';
import { DriverService } from '../../src/drivers/drivers.service';
import { IntegrationsTestModule } from './integrations-test.module';
import { resetDatabase } from './helpers/database.helper';
import { waitForCondition } from './helpers/wait.helper';

describe('Integrations domain (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let userService: UserService;
  let apiKeyService: ApiKeyService;
  let apiKeyGuard: ApiKeyGuard;
  let webhookEndpointService: WebhookEndpointService;
  let webhookPublisherService: WebhookPublisherService;
  let webhookDeliveryService: WebhookDeliveryService;
  let tripService: TripService;
  let vehicleService: VehicleService;
  let driverService: DriverService;
  let vehicleAssignmentService: VehicleAssignmentService;
  let mockWebhookHttpClient: { post: jest.Mock };

  beforeAll(async () => {
    mockWebhookHttpClient = {
      post: jest.fn().mockResolvedValue({ statusCode: 200, body: 'accepted' }),
    };

    moduleRef = await Test.createTestingModule({
      imports: [IntegrationsTestModule],
    })
      .overrideProvider(WEBHOOK_HTTP_CLIENT)
      .useValue(mockWebhookHttpClient)
      .compile();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    userService = moduleRef.get(UserService);
    apiKeyService = moduleRef.get(ApiKeyService);
    apiKeyGuard = moduleRef.get(ApiKeyGuard);
    webhookEndpointService = moduleRef.get(WebhookEndpointService);
    webhookPublisherService = moduleRef.get(WebhookPublisherService);
    webhookDeliveryService = moduleRef.get(WebhookDeliveryService);
    tripService = moduleRef.get(TripService);
    vehicleService = moduleRef.get(VehicleService);
    driverService = moduleRef.get(DriverService);
    vehicleAssignmentService = moduleRef.get(VehicleAssignmentService);
  });

  beforeEach(async () => {
    mockWebhookHttpClient.post.mockReset();
    mockWebhookHttpClient.post.mockResolvedValue({ statusCode: 200, body: 'accepted' });
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleRef.close();
  });

  async function seedFleetContext(suffix: string) {
    const organization = await organizationService.createOrganization({
      name: `Integrations Org ${suffix}`,
      slug: `integrations-org-${suffix}`,
    });

    const actor = await userService.createUser({
      organizationId: organization.id,
      email: 'integrations@integrations-org.test',
      password: 'StrongPassword123!',
      firstName: 'Integration',
      lastName: 'Owner',
    });

    const vehicle = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: 'INT-1001',
      vin: '1FTBR1C85PKI00001',
      make: 'Ford',
      model: 'Transit',
      year: 2022,
    });

    const driver = await driverService.createDriver({
      organizationId: organization.id,
      employeeId: 'INT-DRV-001',
      firstName: 'Webhook',
      lastName: 'Driver',
      licenseNumber: 'INT-LIC-001',
      licenseExpiryDate: '2028-01-01',
    });

    await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      assignedByUserId: actor.id,
    });

    return { organization, actor, vehicle, driver };
  }

  function buildGuardContext(authorization: string) {
    const request = {
      headers: { authorization },
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as ExecutionContext;
  }

  it('authenticates active API keys and updates lastUsedAt', async () => {
    const { organization, actor } = await seedFleetContext('auth');
    const { plaintextKey, apiKey } = await apiKeyService.createApiKey({
      organizationId: organization.id,
      name: 'Primary key',
      createdByUserId: actor.id,
    });

    const context = buildGuardContext(`Bearer ${plaintextKey}`);
    await expect(apiKeyGuard.canActivate(context)).resolves.toBe(true);

    const updated = await prisma.apiKey.findUnique({ where: { id: apiKey.id } });
    expect(updated?.lastUsedAt).not.toBeNull();
    expect(context.switchToHttp().getRequest()).toHaveProperty('integrationsApiKey', {
      apiKeyId: apiKey.id,
      organizationId: organization.id,
    });
  });

  it('rejects expired API keys', async () => {
    const { organization, actor } = await seedFleetContext('expired');
    const { plaintextKey, apiKey } = await apiKeyService.createApiKey({
      organizationId: organization.id,
      name: 'Expired key',
      expiresAt: '2020-01-01T00:00:00.000Z',
      createdByUserId: actor.id,
    });

    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { expiresAt: new Date('2020-01-01T00:00:00.000Z') },
    });

    await expect(
      apiKeyGuard.canActivate(buildGuardContext(`Bearer ${plaintextKey}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects revoked API keys', async () => {
    const { organization, actor } = await seedFleetContext('revoked');
    const { plaintextKey, apiKey } = await apiKeyService.createApiKey({
      organizationId: organization.id,
      name: 'Revoked key',
      createdByUserId: actor.id,
    });

    await apiKeyService.revokeApiKey(organization.id, apiKey.id, actor.id);

    await expect(
      apiKeyGuard.canActivate(buildGuardContext(`Bearer ${plaintextKey}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('creates webhook events when trips are created', async () => {
    const { organization, actor, vehicle, driver } = await seedFleetContext('trip-event');

    await webhookEndpointService.createWebhookEndpoint({
      organizationId: organization.id,
      name: 'Trip sink',
      url: 'https://example.com/webhooks/trips',
      createdByUserId: actor.id,
    });

    await tripService.createTrip({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      tripNumber: 'INT-TRIP-001',
      origin: 'Depot',
      destination: 'Customer',
      scheduledStartAt: '2025-06-10T08:00:00.000Z',
      scheduledEndAt: '2025-06-10T12:00:00.000Z',
      createdByUserId: actor.id,
    });

    const events = await prisma.webhookEvent.findMany({
      where: { organizationId: organization.id },
    });

    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe(WEBHOOK_EVENT_TYPES.TRIP_CREATED);

    await waitForCondition(async () => mockWebhookHttpClient.post.mock.calls.length > 0);
    expect(mockWebhookHttpClient.post).toHaveBeenCalled();
  });

  it('records successful webhook deliveries', async () => {
    const { organization, actor } = await seedFleetContext('success');

    await webhookEndpointService.createWebhookEndpoint({
      organizationId: organization.id,
      name: 'Success sink',
      url: 'https://example.com/webhooks/success',
      createdByUserId: actor.id,
    });

    await webhookPublisherService.publish(organization.id, WEBHOOK_EVENT_TYPES.TRIP_CREATED, {
      tripId: 'trip-1',
    });

    await waitForCondition(async () => {
      const deliveries = await prisma.webhookDelivery.findMany();
      return deliveries.some((delivery) => delivery.status === WebhookDeliveryStatus.SUCCESS);
    });

    const deliveries = await prisma.webhookDelivery.findMany();
    expect(deliveries.some((delivery) => delivery.status === WebhookDeliveryStatus.SUCCESS)).toBe(
      true,
    );
  });

  it('retries failed webhook deliveries up to three attempts', async () => {
    mockWebhookHttpClient.post.mockResolvedValue({ statusCode: 500, body: 'fail' });

    const { organization, actor } = await seedFleetContext('retry');
    const endpoint = await webhookEndpointService.createWebhookEndpoint({
      organizationId: organization.id,
      name: 'Retry sink',
      url: 'https://example.com/webhooks/retry',
      createdByUserId: actor.id,
    });

    const event = await webhookPublisherService.publish(
      organization.id,
      WEBHOOK_EVENT_TYPES.TRIP_STARTED,
      { tripId: 'trip-retry' },
    );

    await waitForCondition(async () => {
      const deliveries = await prisma.webhookDelivery.findMany({
        where: { webhookEndpointId: endpoint.id, webhookEventId: event.id },
      });
      return deliveries.length >= 3;
    }, 20000);

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookEndpointId: endpoint.id, webhookEventId: event.id },
      orderBy: { attemptNumber: 'asc' },
    });

    expect(deliveries).toHaveLength(3);
    expect(deliveries.every((delivery) => delivery.status === WebhookDeliveryStatus.FAILED)).toBe(
      true,
    );

    const jobs = await prisma.job.findMany({
      where: { organizationId: organization.id, type: JobType.WEBHOOK_DELIVERY },
    });
    expect(jobs.some((job) => job.status === JobStatus.FAILED)).toBe(true);
    expect(mockWebhookHttpClient.post.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  it('exposes retryDelivery for background workers', async () => {
    const { organization, actor } = await seedFleetContext('worker');
    const endpoint = await webhookEndpointService.createWebhookEndpoint({
      organizationId: organization.id,
      name: 'Worker sink',
      url: 'https://example.com/webhooks/worker',
      createdByUserId: actor.id,
    });

    const event = await prisma.webhookEvent.create({
      data: {
        organizationId: organization.id,
        eventType: WEBHOOK_EVENT_TYPES.FUEL_RECORD_CREATED,
        payload: { fuelRecordId: 'fuel-1' },
      },
    });

    mockWebhookHttpClient.post.mockResolvedValueOnce({ statusCode: 500, body: 'fail' });
    await webhookDeliveryService.deliverEvent(endpoint.id, event.id, 1);

    mockWebhookHttpClient.post.mockResolvedValueOnce({ statusCode: 200, body: 'ok' });
    const retryResult = await webhookDeliveryService.retryDelivery(endpoint.id, event.id);

    expect(retryResult?.success).toBe(true);
    expect(retryResult?.delivery.attemptNumber).toBe(2);
  });

  it('isolates webhook deliveries by organization', async () => {
    const orgA = await seedFleetContext('org-a');
    const orgB = await seedFleetContext('org-b');

    await webhookEndpointService.createWebhookEndpoint({
      organizationId: orgA.organization.id,
      name: 'Org A sink',
      url: 'https://example.com/webhooks/a',
      createdByUserId: orgA.actor.id,
    });

    await webhookPublisherService.publish(orgA.organization.id, WEBHOOK_EVENT_TYPES.TRIP_CREATED, {
      tripId: 'trip-a',
    });

    const orgBDeliveries = await webhookPublisherService.listDeliveries(orgB.organization.id);
    expect(orgBDeliveries).toHaveLength(0);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { JobStatus, JobType, WebhookDeliveryStatus } from '@prisma/client';

import { DriverService } from '../../src/drivers/drivers.service';
import { WEBHOOK_HTTP_CLIENT } from '../../src/integrations/interfaces/webhook-http-client.interface';
import { WebhookEndpointService } from '../../src/integrations/webhook-endpoints.service';
import { WebhookPublisherService } from '../../src/integrations/webhook-publisher.service';
import { WEBHOOK_EVENT_TYPES } from '../../src/integrations/constants/integrations.constants';
import { OrganizationService } from '../../src/organizations/organizations.service';
import { JobService } from '../../src/queues/jobs.service';
import { ReminderGenerationService } from '../../src/queues/reminder-generation.service';
import { ReportGenerationQueueService } from '../../src/queues/report-generation-queue.service';
import { PrismaService } from '../../src/database/prisma.service';
import { UserService } from '../../src/users/users.service';
import { VehicleService } from '../../src/vehicles/vehicles.service';
import { MaintenanceService } from '../../src/maintenance/maintenance.service';
import { RoleService } from '../../src/roles/roles.service';
import { ADMIN_ROLE_NAME } from '../../src/authorization/constants/authorization.constants';
import { QueuesTestModule } from './queues-test.module';
import { resetDatabase } from './helpers/database.helper';
import { waitForCondition } from './helpers/wait.helper';

describe('Queues domain (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let userService: UserService;
  let roleService: RoleService;
  let driverService: DriverService;
  let vehicleService: VehicleService;
  let maintenanceService: MaintenanceService;
  let webhookPublisherService: WebhookPublisherService;
  let webhookEndpointService: WebhookEndpointService;
  let jobService: JobService;
  let reminderGenerationService: ReminderGenerationService;
  let reportGenerationQueueService: ReportGenerationQueueService;
  let mockWebhookHttpClient: { post: jest.Mock };

  beforeAll(async () => {
    mockWebhookHttpClient = {
      post: jest.fn().mockResolvedValue({ statusCode: 200, body: 'accepted' }),
    };

    moduleRef = await Test.createTestingModule({
      imports: [QueuesTestModule],
    })
      .overrideProvider(WEBHOOK_HTTP_CLIENT)
      .useValue(mockWebhookHttpClient)
      .compile();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    userService = moduleRef.get(UserService);
    roleService = moduleRef.get(RoleService);
    driverService = moduleRef.get(DriverService);
    vehicleService = moduleRef.get(VehicleService);
    maintenanceService = moduleRef.get(MaintenanceService);
    webhookPublisherService = moduleRef.get(WebhookPublisherService);
    webhookEndpointService = moduleRef.get(WebhookEndpointService);
    jobService = moduleRef.get(JobService);
    reminderGenerationService = moduleRef.get(ReminderGenerationService);
    reportGenerationQueueService = moduleRef.get(ReportGenerationQueueService);
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

  async function seedOrganizationContext(suffix: string) {
    const organization = await organizationService.createOrganization({
      name: `Queue Org ${suffix}`,
      slug: `queue-org-${suffix}`,
    });

    const actor = await userService.createUser({
      organizationId: organization.id,
      email: `queue-${suffix}@queue-org.test`,
      password: 'StrongPassword123!',
      firstName: 'Queue',
      lastName: 'Operator',
    });

    const adminRole = await roleService.createRole({
      organizationId: organization.id,
      name: ADMIN_ROLE_NAME,
    });
    await roleService.assignRoleToUser(actor.id, adminRole.id);

    return { organization, actor };
  }

  it('queues webhook deliveries for asynchronous processing', async () => {
    const { organization, actor } = await seedOrganizationContext('webhook');

    await webhookEndpointService.createWebhookEndpoint({
      organizationId: organization.id,
      name: 'Async sink',
      url: 'https://example.com/webhooks/async',
      createdByUserId: actor.id,
    });

    await webhookPublisherService.publish(organization.id, WEBHOOK_EVENT_TYPES.TRIP_CREATED, {
      tripId: 'trip-async',
    });

    await waitForCondition(async () => {
      const jobs = await prisma.job.findMany({
        where: { organizationId: organization.id, type: JobType.WEBHOOK_DELIVERY },
      });
      return jobs.some((job) => job.status === JobStatus.COMPLETED);
    });

    const deliveries = await prisma.webhookDelivery.findMany();
    expect(deliveries.some((delivery) => delivery.status === WebhookDeliveryStatus.SUCCESS)).toBe(
      true,
    );
    expect(mockWebhookHttpClient.post).toHaveBeenCalled();
  });

  it('creates license expiry reminder jobs', async () => {
    const { organization } = await seedOrganizationContext('license');

    const expiryDate = new Date();
    expiryDate.setUTCDate(expiryDate.getUTCDate() + 15);

    await driverService.createDriver({
      organizationId: organization.id,
      employeeId: 'LIC-001',
      firstName: 'Soon',
      lastName: 'Expired',
      licenseNumber: 'LIC123456',
      licenseExpiryDate: expiryDate.toISOString().slice(0, 10),
    });

    const enqueued = await reminderGenerationService.generateLicenseExpiryReminders();

    expect(enqueued).toBe(1);

    await waitForCondition(async () => {
      const jobs = await prisma.job.findMany({
        where: {
          organizationId: organization.id,
          type: JobType.LICENSE_EXPIRY_REMINDER,
        },
      });
      return jobs.length > 0;
    });
  });

  it('creates maintenance reminder jobs', async () => {
    const { organization, actor } = await seedOrganizationContext('maintenance');

    const vehicle = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: 'Q-1001',
      vin: '1FTBR1C85PKQ00001',
      make: 'Ford',
      model: 'Transit',
      year: 2023,
    });

    const scheduledAt = new Date();
    scheduledAt.setUTCDate(scheduledAt.getUTCDate() + 3);

    await maintenanceService.scheduleMaintenance({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      title: 'Brake inspection',
      maintenanceType: 'PREVENTIVE',
      scheduledAt: scheduledAt.toISOString(),
      createdByUserId: actor.id,
    });

    const enqueued = await reminderGenerationService.generateMaintenanceReminders();

    expect(enqueued).toBe(1);

    await waitForCondition(async () => {
      const jobs = await prisma.job.findMany({
        where: {
          organizationId: organization.id,
          type: JobType.MAINTENANCE_REMINDER,
        },
      });
      return jobs.some((job) => job.status === JobStatus.COMPLETED);
    });
  });

  it('runs report generation jobs through pending to completed', async () => {
    const { organization, actor } = await seedOrganizationContext('report');

    const jobId = await reportGenerationQueueService.enqueueReportGeneration({
      organizationId: organization.id,
      reportType: 'fleet',
      requestedByUserId: actor.id,
    });

    await waitForCondition(async () => {
      const job = await jobService.getJob(organization.id, jobId);
      return job.status === JobStatus.COMPLETED;
    });

    const completedJob = await jobService.getJob(organization.id, jobId);
    expect(completedJob.result).toBeTruthy();
  });
});

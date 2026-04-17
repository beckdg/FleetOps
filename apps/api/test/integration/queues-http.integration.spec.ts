import { JobType } from '@prisma/client';
import request from 'supertest';
import { randomUUID } from 'crypto';

import { JobService } from '../../src/queues/jobs.service';
import {
  HttpTestEnv,
  apiPath,
  assignPermissionsToUser,
  bootstrapHttpTestEnv,
  createOrganization,
  createUser,
  expectCrossOrganizationDenied,
  login,
  prepareHttpTestDatabase,
  registerProtectedEndpointRbacTests,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';

describe('Queues HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: { organization: { id: string; slug: string }; jobId?: string };

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    const organization = await createOrganization(env, `queues-http-${Date.now()}`);
    fixture = { organization: { id: organization.id, slug: organization.slug } };
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: 'GET /jobs',
      method: 'get',
      path: '/jobs',
      permission: { resource: 'jobs', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: 'GET /jobs/:id',
      method: 'get',
      path: (ctx) => `/jobs/${ctx.jobId}`,
      permission: { resource: 'jobs', action: 'read' },
      prepareAuthorizedContext: async (ctx) => {
        const jobService = env.moduleRef.get(JobService);
        const job = await jobService.createJobRecord({
          organizationId: ctx.organization.id,
          type: JobType.REPORT_GENERATION,
          queueName: 'report-generation',
          payload: { reportType: 'fleet' },
        });

        return { ...ctx, jobId: job.id };
      },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: 'GET /queues/health',
      method: 'get',
      path: '/queues/health',
      permission: { resource: 'jobs', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: 'POST /jobs/reports/fleet',
      method: 'post',
      path: '/jobs/reports/fleet',
      permission: { resource: 'jobs', action: 'write' },
      body: {},
      successStatus: 201,
    },
  );

  it('returns 404 for a non-existent job', async () => {
    const organization = await createOrganization(env, `missing-job-${Date.now()}`);
    const user = await createUser(env, organization.id, 'jobs-missing@queue-health.test');
    await assignPermissionsToUser(env, organization.id, user.id, [
      { resource: 'jobs', action: 'read' },
    ]);

    const token = await login(env, organization.slug, 'jobs-missing@queue-health.test');

    await request(env.app.getHttpServer())
      .get(apiPath(`/jobs/${randomUUID()}`))
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('denies reading another organization job', async () => {
    const orgA = await createOrganization(env, `jobs-org-a-${Date.now()}`);
    const orgB = await createOrganization(env, `jobs-org-b-${Date.now()}`);

    const jobService = env.moduleRef.get(JobService);
    const job = await jobService.createJobRecord({
      organizationId: orgB.id,
      type: JobType.REPORT_GENERATION,
      queueName: 'report-generation',
      payload: { reportType: 'fleet' },
    });

    const userA = await createUser(env, orgA.id, 'jobs-a@http.test');
    await assignPermissionsToUser(env, orgA.id, userA.id, [{ resource: 'jobs', action: 'read' }]);
    const token = await login(env, orgA.slug, 'jobs-a@http.test');

    await expectCrossOrganizationDenied(env, token, 'get', `/jobs/${job.id}`);
  });

  it('returns queue health metrics', async () => {
    const organization = await createOrganization(env, `queue-health-${Date.now()}`);
    const user = await createUser(env, organization.id, 'jobs@queue-health.test');
    await assignPermissionsToUser(env, organization.id, user.id, [
      { resource: 'jobs', action: 'read' },
    ]);

    const token = await login(env, organization.slug, 'jobs@queue-health.test');

    await request(env.app.getHttpServer())
      .get(apiPath('/queues/health'))
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.queues).toHaveLength(4);
        expect(body.checkedAt).toBeDefined();
      });
  });
});

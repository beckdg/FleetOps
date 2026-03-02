import request from 'supertest';

import {
  apiPath,
  assignPermissionsToUser,
  bootstrapHttpTestEnv,
  createAuthenticatedUser,
  createOrganization,
  prepareHttpTestDatabase,
  ProtectedEndpointSpec,
  runProtectedEndpointMatrix,
  teardownHttpTestEnv,
  type HttpTestEnv,
} from './helpers/http-test.helper';

describe('Queues HTTP (integration)', () => {
  let env: HttpTestEnv;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  interface QueuesHttpContext {
    organizationId: string;
  }

  async function prepareContext(): Promise<QueuesHttpContext> {
    const organization = await createOrganization(env, 'queues-http-org');
    return { organizationId: organization.id };
  }

  const protectedEndpoints: ProtectedEndpointSpec<QueuesHttpContext>[] = [
    {
      label: 'GET /jobs',
      method: 'get',
      path: '/jobs',
      permission: { resource: 'jobs', action: 'read' },
    },
    {
      label: 'GET /queues/health',
      method: 'get',
      path: '/queues/health',
      permission: { resource: 'jobs', action: 'read' },
    },
    {
      label: 'POST /jobs/reports/fleet',
      method: 'post',
      path: '/jobs/reports/fleet',
      permission: { resource: 'jobs', action: 'write' },
      body: {},
      successStatus: 201,
    },
  ];

  runProtectedEndpointMatrix(env, prepareContext, protectedEndpoints);

  it('returns queue health metrics', async () => {
    const organization = await createOrganization(env, 'queue-health-org');
    const user = await createAuthenticatedUser(env, organization.id, 'jobs@queue-health.test');
    await assignPermissionsToUser(env, organization.id, user.id, [
      { resource: 'jobs', action: 'read' },
    ]);

    const token = await request(env.app.getHttpServer())
      .post(apiPath('/auth/login'))
      .send({
        organizationSlug: organization.slug,
        email: 'jobs@queue-health.test',
        password: 'StrongPassword123!',
      })
      .expect(200)
      .then((response) => response.body.accessToken as string);

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

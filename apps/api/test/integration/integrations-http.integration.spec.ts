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

describe('Integrations HTTP (integration)', () => {
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

  interface IntegrationsHttpContext {
    organizationId: string;
    organizationSlug: string;
    apiKeyId?: string;
  }

  async function prepareContext(): Promise<IntegrationsHttpContext> {
    const organization = await createOrganization(env, 'integrations-http-org');

    return {
      organizationId: organization.id,
      organizationSlug: organization.slug,
    };
  }

  const protectedEndpoints: ProtectedEndpointSpec<IntegrationsHttpContext>[] = [
    {
      label: 'POST /api-keys',
      method: 'post',
      path: '/api-keys',
      permission: { resource: 'integrations', action: 'write' },
      body: { name: 'HTTP test key' },
      successStatus: 201,
    },
    {
      label: 'GET /api-keys',
      method: 'get',
      path: '/api-keys',
      permission: { resource: 'integrations', action: 'read' },
    },
    {
      label: 'POST /webhooks',
      method: 'post',
      path: '/webhooks',
      permission: { resource: 'integrations', action: 'write' },
      body: { name: 'HTTP webhook', url: 'https://example.com/hook' },
      successStatus: 201,
    },
    {
      label: 'GET /webhooks',
      method: 'get',
      path: '/webhooks',
      permission: { resource: 'integrations', action: 'read' },
    },
    {
      label: 'GET /webhook-deliveries',
      method: 'get',
      path: '/webhook-deliveries',
      permission: { resource: 'integrations', action: 'read' },
    },
  ];

  runProtectedEndpointMatrix(env, prepareContext, protectedEndpoints);

  it('allows API key authentication on the public context endpoint', async () => {
    const organization = await createOrganization(env, 'api-key-auth-org');
    const admin = await createAuthenticatedUser(env, organization.id, 'admin@api-key-auth.test');
    await assignPermissionsToUser(env, organization.id, admin.id, [
      { resource: 'integrations', action: 'write' },
    ]);

    const token = await request(env.app.getHttpServer())
      .post(apiPath('/auth/login'))
      .send({
        organizationSlug: organization.slug,
        email: 'admin@api-key-auth.test',
        password: 'StrongPassword123!',
      })
      .expect(200)
      .then((response) => response.body.accessToken as string);

    const createResponse = await request(env.app.getHttpServer())
      .post(apiPath('/api-keys'))
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'External connector' })
      .expect(201);

    const apiKey = createResponse.body.plaintextKey as string;

    await request(env.app.getHttpServer())
      .get(apiPath('/integrations/context'))
      .set('Authorization', `Bearer ${apiKey}`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.organizationId).toBe(organization.id);
        expect(body.apiKeyId).toBe(createResponse.body.id);
      });
  });
});

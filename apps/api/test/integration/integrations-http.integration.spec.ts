import request from 'supertest';

import { ApiKeyService } from '../../src/integrations/api-keys.service';
import { WebhookEndpointService } from '../../src/integrations/webhook-endpoints.service';
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

describe('Integrations HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: {
    organization: { id: string; slug: string };
    apiKeyId?: string;
    webhookId?: string;
  };

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    const organization = await createOrganization(env, `integrations-http-${Date.now()}`);
    fixture = { organization: { id: organization.id, slug: organization.slug } };
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: 'POST /api-keys',
      method: 'post',
      path: '/api-keys',
      permission: { resource: 'integrations', action: 'write' },
      body: { name: 'HTTP test key' },
      successStatus: 201,
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: 'GET /api-keys',
      method: 'get',
      path: '/api-keys',
      permission: { resource: 'integrations', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: 'POST /webhooks',
      method: 'post',
      path: '/webhooks',
      permission: { resource: 'integrations', action: 'write' },
      body: { name: 'HTTP webhook', url: 'https://example.com/hook' },
      successStatus: 201,
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: 'GET /webhooks',
      method: 'get',
      path: '/webhooks',
      permission: { resource: 'integrations', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: 'GET /webhook-deliveries',
      method: 'get',
      path: '/webhook-deliveries',
      permission: { resource: 'integrations', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: 'DELETE /api-keys/:id',
      method: 'delete',
      path: (ctx) => `/api-keys/${ctx.apiKeyId}`,
      permission: { resource: 'integrations', action: 'write' },
      successStatus: 200,
      prepareAuthorizedContext: async (ctx) => {
        const owner = await createUser(
          env,
          ctx.organization.id,
          `key-owner-${Date.now()}@http.test`,
        );
        const apiKeyService = env.moduleRef.get(ApiKeyService);
        const { apiKey } = await apiKeyService.createApiKey({
          organizationId: ctx.organization.id,
          createdByUserId: owner.id,
          name: 'Revoke target key',
        });

        return { ...ctx, apiKeyId: apiKey.id };
      },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: 'PATCH /webhooks/:id',
      method: 'patch',
      path: (ctx) => `/webhooks/${ctx.webhookId}`,
      permission: { resource: 'integrations', action: 'write' },
      body: { name: 'Updated webhook name' },
      prepareAuthorizedContext: async (ctx) => {
        const owner = await createUser(
          env,
          ctx.organization.id,
          `webhook-owner-${Date.now()}@http.test`,
        );
        const webhookEndpointService = env.moduleRef.get(WebhookEndpointService);
        const endpoint = await webhookEndpointService.createWebhookEndpoint({
          organizationId: ctx.organization.id,
          createdByUserId: owner.id,
          name: 'Patch target webhook',
          url: 'https://example.com/patch-target',
        });

        return { ...ctx, webhookId: endpoint.id };
      },
    },
  );

  it('denies revoking another organization API key', async () => {
    const orgA = await createOrganization(env, `integrations-org-a-${Date.now()}`);
    const orgB = await createOrganization(env, `integrations-org-b-${Date.now()}`);

    const ownerB = await createUser(env, orgB.id, 'owner-b@http.test');
    const apiKeyService = env.moduleRef.get(ApiKeyService);
    const { apiKey } = await apiKeyService.createApiKey({
      organizationId: orgB.id,
      createdByUserId: ownerB.id,
      name: 'Org B key',
    });

    const userA = await createUser(env, orgA.id, 'integrations-a@http.test');
    await assignPermissionsToUser(env, orgA.id, userA.id, [
      { resource: 'integrations', action: 'write' },
    ]);
    const token = await login(env, orgA.slug, 'integrations-a@http.test');

    await expectCrossOrganizationDenied(env, token, 'delete', `/api-keys/${apiKey.id}`);
  });

  it('denies updating another organization webhook', async () => {
    const orgA = await createOrganization(env, `webhooks-org-a-${Date.now()}`);
    const orgB = await createOrganization(env, `webhooks-org-b-${Date.now()}`);

    const ownerB = await createUser(env, orgB.id, 'webhook-owner-b@http.test');
    const webhookEndpointService = env.moduleRef.get(WebhookEndpointService);
    const endpoint = await webhookEndpointService.createWebhookEndpoint({
      organizationId: orgB.id,
      createdByUserId: ownerB.id,
      name: 'Org B webhook',
      url: 'https://example.com/org-b',
    });

    const userA = await createUser(env, orgA.id, 'webhooks-a@http.test');
    await assignPermissionsToUser(env, orgA.id, userA.id, [
      { resource: 'integrations', action: 'write' },
    ]);
    const token = await login(env, orgA.slug, 'webhooks-a@http.test');

    await expectCrossOrganizationDenied(env, token, 'patch', `/webhooks/${endpoint.id}`, {
      name: 'Cross-org update attempt',
    });
  });

  it('allows API key authentication on the public context endpoint', async () => {
    const organization = await createOrganization(env, `api-key-auth-${Date.now()}`);
    const admin = await createUser(env, organization.id, 'admin@api-key-auth.test');
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

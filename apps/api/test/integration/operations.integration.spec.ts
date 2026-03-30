import request from 'supertest';

import { DEFAULT_REGISTRATION_ROLE } from '../../src/auth/constants/auth.constants';
import { AuditEventStore } from '../../src/operations/audit/audit-event.store';
import { REQUEST_ID_HEADER } from '../../src/operations/constants/operations.constants';
import {
  AUTH_BASE,
  DEFAULT_PASSWORD,
  HttpTestEnv,
  apiPath,
  assignPermissionsToUser,
  bootstrapHttpTestEnv,
  createOrganization,
  createUser,
  prepareHttpTestDatabase,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import { RoleService } from '../../src/roles/roles.service';

describe('Operational hardening (integration)', () => {
  let env: HttpTestEnv;
  let roleService: RoleService;

  beforeAll(async () => {
    process.env.RATE_LIMIT_AUTH_LIMIT = '2';
    process.env.RATE_LIMIT_AUTH_TTL_MS = '60000';
    process.env.ACCOUNT_LOCKOUT_MAX_ATTEMPTS = '3';

    env = await bootstrapHttpTestEnv();
    roleService = env.moduleRef.get(RoleService);
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  async function seedOrganization(slug: string) {
    const organization = await createOrganization(env, slug);

    await roleService.createRole({
      organizationId: organization.id,
      name: DEFAULT_REGISTRATION_ROLE,
    });

    return organization;
  }

  it('returns and echoes X-Request-Id on health checks', async () => {
    const incomingRequestId = 'integration-request-id-12345678';

    const response = await request(env.app.getHttpServer())
      .get(apiPath('/health'))
      .set(REQUEST_ID_HEADER, incomingRequestId)
      .expect(200);

    expect(response.headers[REQUEST_ID_HEADER]).toBe(incomingRequestId);
    expect(response.body.version).toBeDefined();
    expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(response.body.checks.database).toBeDefined();
    expect(response.body.checks.redis).toBeDefined();
    expect(response.body.checks.queues).toBeDefined();
  });

  it('includes requestId on error responses', async () => {
    const response = await request(env.app.getHttpServer())
      .post(`${AUTH_BASE}/login`)
      .set(REQUEST_ID_HEADER, 'error-correlation-request-id')
      .send({
        organizationSlug: 'missing-org',
        email: 'missing@example.test',
        password: DEFAULT_PASSWORD,
      })
      .expect(404);

    expect(response.headers[REQUEST_ID_HEADER]).toBe('error-correlation-request-id');
    expect(response.body.requestId).toBe('error-correlation-request-id');
  });

  it('locks accounts after repeated failed login attempts', async () => {
    const organization = await seedOrganization('lockout-org');
    await createUser(env, organization.id, 'locked.user@example.test');

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/login`)
        .send({
          organizationSlug: organization.slug,
          email: 'locked.user@example.test',
          password: 'WrongPassword123!',
        })
        .expect(401);
    }

    await request(env.app.getHttpServer())
      .post(`${AUTH_BASE}/login`)
      .send({
        organizationSlug: organization.slug,
        email: 'locked.user@example.test',
        password: DEFAULT_PASSWORD,
      })
      .expect(401)
      .expect((response) => {
        expect(response.body.message).toBe(
          'Account is temporarily locked due to failed login attempts',
        );
      });
  });

  it('rate limits auth endpoints by IP', async () => {
    const organization = await seedOrganization('rate-limit-org');

    await request(env.app.getHttpServer())
      .post(`${AUTH_BASE}/register`)
      .send({
        organizationSlug: organization.slug,
        email: 'rate.limit@example.test',
        password: DEFAULT_PASSWORD,
        firstName: 'Rate',
        lastName: 'Limit',
      })
      .expect(201);

    await request(env.app.getHttpServer())
      .post(`${AUTH_BASE}/login`)
      .send({
        organizationSlug: organization.slug,
        email: 'rate.limit@example.test',
        password: DEFAULT_PASSWORD,
      })
      .expect(200);

    await request(env.app.getHttpServer())
      .post(`${AUTH_BASE}/login`)
      .send({
        organizationSlug: organization.slug,
        email: 'rate.limit@example.test',
        password: DEFAULT_PASSWORD,
      })
      .expect(429);
  });

  it('exports audit logs for authorized users', async () => {
    const organization = await seedOrganization('audit-export-org');
    const user = await createUser(env, organization.id, 'audit.reader@example.test');
    await assignPermissionsToUser(env, organization.id, user.id, [
      { resource: 'audit', action: 'read' },
    ]);

    const auditStore = env.moduleRef.get(AuditEventStore);
    auditStore.clear();
    auditStore.append('job_created', { jobId: 'job-1' }, 'req-export-1');

    const loginResponse = await request(env.app.getHttpServer())
      .post(`${AUTH_BASE}/login`)
      .send({
        organizationSlug: organization.slug,
        email: 'audit.reader@example.test',
        password: DEFAULT_PASSWORD,
      })
      .expect(200);

    const response = await request(env.app.getHttpServer())
      .get(apiPath('/audit/export'))
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .query({ format: 'json' })
      .expect(200);

    expect(response.body.format).toBe('json');
    expect(response.body.count).toBeGreaterThanOrEqual(1);
  });

  it('returns metrics for authorized users', async () => {
    const organization = await seedOrganization('metrics-org');
    const user = await createUser(env, organization.id, 'metrics.reader@example.test');
    await assignPermissionsToUser(env, organization.id, user.id, [
      { resource: 'metrics', action: 'read' },
    ]);

    const loginResponse = await request(env.app.getHttpServer())
      .post(`${AUTH_BASE}/login`)
      .send({
        organizationSlug: organization.slug,
        email: 'metrics.reader@example.test',
        password: DEFAULT_PASSWORD,
      })
      .expect(200);

    const response = await request(env.app.getHttpServer())
      .get(apiPath('/metrics'))
      .set('Authorization', `Bearer ${loginResponse.body.accessToken}`)
      .expect(200);

    expect(response.body.requests).toEqual(
      expect.objectContaining({ total: expect.any(Number), failed: expect.any(Number) }),
    );
    expect(response.body.jobs).toBeDefined();
    expect(response.body.webhooks).toBeDefined();
  });
});

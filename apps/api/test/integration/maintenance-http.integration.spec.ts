import {
  HttpTestEnv,
  bootstrapHttpTestEnv,
  prepareHttpTestDatabase,
  registerProtectedEndpointRbacTests,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import {
  HttpFleetFixture,
  createFreshScheduledMaintenance,
  maintenanceCreateBody,
  seedHttpFleetFixture,
} from './helpers/http-test.fixture';

describe('Maintenance HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: HttpFleetFixture;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    fixture = await seedHttpFleetFixture(env, 'maintenance-http');
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/maintenance schedule',
      method: 'post',
      path: '/maintenance',
      permission: { resource: 'maintenance', action: 'write' },
      body: (ctx) => maintenanceCreateBody(ctx),
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/maintenance list',
      method: 'get',
      path: '/maintenance',
      permission: { resource: 'maintenance', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/maintenance/:maintenanceId/start',
      method: 'post',
      path: (ctx) => `/maintenance/${ctx.scheduledMaintenance.id}/start`,
      permission: { resource: 'maintenance', action: 'write' },
      successStatus: 200,
      body: {},
      prepareAuthorizedContext: async (ctx) => {
        ctx.scheduledMaintenance = await createFreshScheduledMaintenance(env, ctx);
        return ctx;
      },
      prepareAdminContext: async (ctx) => {
        ctx.scheduledMaintenance = await createFreshScheduledMaintenance(env, ctx);
        return ctx;
      },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/maintenance/:maintenanceId/complete',
      method: 'post',
      path: (ctx) => `/maintenance/${ctx.inProgressMaintenance.id}/complete`,
      permission: { resource: 'maintenance', action: 'write' },
      successStatus: 200,
      body: { actualCost: '150.00' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/maintenance/:maintenanceId/cancel',
      method: 'post',
      path: (ctx) => `/maintenance/${ctx.adminScheduledMaintenance.id}/cancel`,
      permission: { resource: 'maintenance', action: 'write' },
      successStatus: 200,
      body: {},
      prepareAuthorizedContext: async (ctx) => {
        ctx.adminScheduledMaintenance = await createFreshScheduledMaintenance(env, ctx);
        return ctx;
      },
      prepareAdminContext: async (ctx) => {
        ctx.adminScheduledMaintenance = await createFreshScheduledMaintenance(env, ctx);
        return ctx;
      },
    },
  );
});

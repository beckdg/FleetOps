import {
  HttpTestEnv,
  bootstrapHttpTestEnv,
  prepareHttpTestDatabase,
  registerProtectedEndpointRbacTests,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import {
  HttpFleetFixture,
  createFreshPlannedTrip,
  ensureAssignableTripResources,
  seedHttpFleetFixture,
  tripCreateBody,
} from './helpers/http-test.fixture';

describe('Trips HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: HttpFleetFixture;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    fixture = await seedHttpFleetFixture(env, 'trips-http');
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/trips create',
      method: 'post',
      path: '/trips',
      permission: { resource: 'trips', action: 'write' },
      prepareAuthorizedContext: async (ctx) => {
        await ensureAssignableTripResources(env, ctx);
        return ctx;
      },
      prepareAdminContext: async (ctx) => {
        await ensureAssignableTripResources(env, ctx);
        return ctx;
      },
      body: (ctx) => tripCreateBody(ctx, `${Date.now()}`),
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/trips list',
      method: 'get',
      path: '/trips',
      permission: { resource: 'trips', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/trips/active list',
      method: 'get',
      path: '/trips/active',
      permission: { resource: 'trips', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/trips/:tripId/dispatch',
      method: 'post',
      path: (ctx) => `/trips/${ctx.plannedTrip.id}/dispatch`,
      permission: { resource: 'trips', action: 'write' },
      successStatus: 200,
      body: {},
      prepareAuthorizedContext: async (ctx) => {
        ctx.plannedTrip = await createFreshPlannedTrip(env, ctx);
        return ctx;
      },
      prepareAdminContext: async (ctx) => {
        ctx.plannedTrip = await createFreshPlannedTrip(env, ctx);
        return ctx;
      },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/trips/:tripId/start',
      method: 'post',
      path: (ctx) => `/trips/${ctx.dispatchedTrip.id}/start`,
      permission: { resource: 'trips', action: 'write' },
      successStatus: 200,
      body: {},
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/trips/:tripId/complete',
      method: 'post',
      path: (ctx) => `/trips/${ctx.inProgressTrip.id}/complete`,
      permission: { resource: 'trips', action: 'write' },
      successStatus: 200,
      body: {},
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/trips/:tripId/cancel',
      method: 'post',
      path: (ctx) => `/trips/${ctx.adminPlannedTrip.id}/cancel`,
      permission: { resource: 'trips', action: 'write' },
      successStatus: 200,
      body: {},
      prepareAuthorizedContext: async (ctx) => {
        ctx.adminPlannedTrip = await createFreshPlannedTrip(env, ctx);
        return ctx;
      },
      prepareAdminContext: async (ctx) => {
        ctx.adminPlannedTrip = await createFreshPlannedTrip(env, ctx);
        return ctx;
      },
    },
  );
});

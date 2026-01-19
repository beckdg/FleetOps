import {
  HttpTestEnv,
  bootstrapHttpTestEnv,
  prepareHttpTestDatabase,
  registerProtectedEndpointRbacTests,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import {
  HttpFleetFixture,
  fuelRecordCreateBody,
  fuelStationCreateBody,
  seedHttpFleetFixture,
} from './helpers/http-test.fixture';

describe('Fuel HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: HttpFleetFixture;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    fixture = await seedHttpFleetFixture(env, 'fuel-http');
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/fuel/records create',
      method: 'post',
      path: '/fuel/records',
      permission: { resource: 'fuel', action: 'write' },
      body: (ctx) => fuelRecordCreateBody(ctx),
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/fuel/records list',
      method: 'get',
      path: '/fuel/records',
      permission: { resource: 'fuel', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/fuel/stations create',
      method: 'post',
      path: '/fuel/stations',
      permission: { resource: 'fuel', action: 'write' },
      body: () => fuelStationCreateBody(`${Date.now()}`),
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/fuel/vehicles/:vehicleId/summary',
      method: 'get',
      path: (ctx) => `/fuel/vehicles/${ctx.fuelVehicle.id}/summary`,
      permission: { resource: 'fuel', action: 'read' },
    },
  );
});

import { DriverStatus } from '@prisma/client';

import {
  HttpTestEnv,
  bootstrapHttpTestEnv,
  prepareHttpTestDatabase,
  registerProtectedEndpointRbacTests,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import {
  HttpFleetFixture,
  driverCreateBody,
  seedHttpFleetFixture,
} from './helpers/http-test.fixture';

describe('Drivers HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: HttpFleetFixture;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    fixture = await seedHttpFleetFixture(env, 'drivers-http');
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/drivers create',
      method: 'post',
      path: '/drivers',
      permission: { resource: 'drivers', action: 'write' },
      body: () => driverCreateBody(`${Date.now()}`),
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/drivers list',
      method: 'get',
      path: '/drivers',
      permission: { resource: 'drivers', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/drivers/:driverId get',
      method: 'get',
      path: (ctx) => `/drivers/${ctx.driver.id}`,
      permission: { resource: 'drivers', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/drivers/:driverId/status patch',
      method: 'patch',
      path: (ctx) => `/drivers/${ctx.driver.id}/status`,
      permission: { resource: 'drivers', action: 'write' },
      body: { status: DriverStatus.SUSPENDED },
      prepareAdminContext: async (ctx) => {
        ctx.driver = ctx.secondaryDriver;
        return ctx;
      },
    },
  );
});

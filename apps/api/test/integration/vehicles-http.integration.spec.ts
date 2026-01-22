import { VehicleStatus } from '@prisma/client';

import {
  HttpTestEnv,
  bootstrapHttpTestEnv,
  prepareHttpTestDatabase,
  registerProtectedEndpointRbacTests,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import {
  HttpFleetFixture,
  seedHttpFleetFixture,
  vehicleCreateBody,
} from './helpers/http-test.fixture';

describe('Vehicles HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: HttpFleetFixture;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    fixture = await seedHttpFleetFixture(env, 'vehicles-http');
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/vehicles create',
      method: 'post',
      path: '/vehicles',
      permission: { resource: 'vehicles', action: 'write' },
      body: () => vehicleCreateBody(`${Date.now()}`),
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/vehicles list',
      method: 'get',
      path: '/vehicles',
      permission: { resource: 'vehicles', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/vehicles/:vehicleId get',
      method: 'get',
      path: (ctx) => `/vehicles/${ctx.vehicle.id}`,
      permission: { resource: 'vehicles', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/vehicles/:vehicleId/status patch',
      method: 'patch',
      path: (ctx) => `/vehicles/${ctx.vehicle.id}/status`,
      permission: { resource: 'vehicles', action: 'write' },
      body: { status: VehicleStatus.IN_MAINTENANCE },
      prepareAdminContext: async (ctx) => {
        ctx.vehicle = ctx.secondaryVehicle;
        return ctx;
      },
    },
  );
});

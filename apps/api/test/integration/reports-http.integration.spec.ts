import {
  HttpTestEnv,
  bootstrapHttpTestEnv,
  prepareHttpTestDatabase,
  registerProtectedEndpointRbacTests,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import { HttpFleetFixture, seedHttpFleetFixture } from './helpers/http-test.fixture';

describe('Reports HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: HttpFleetFixture;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    fixture = await seedHttpFleetFixture(env, 'reports-http');
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/reports/dashboard',
      method: 'get',
      path: '/reports/dashboard',
      permission: { resource: 'reports', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/reports/fleet',
      method: 'get',
      path: '/reports/fleet',
      permission: { resource: 'reports', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/reports/fuel',
      method: 'get',
      path: '/reports/fuel',
      permission: { resource: 'reports', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/reports/maintenance',
      method: 'get',
      path: '/reports/maintenance',
      permission: { resource: 'reports', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/reports/trips',
      method: 'get',
      path: '/reports/trips',
      permission: { resource: 'reports', action: 'read' },
    },
  );
});

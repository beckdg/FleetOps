import {
  HttpTestEnv,
  bootstrapHttpTestEnv,
  prepareHttpTestDatabase,
  registerProtectedEndpointRbacTests,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import {
  HttpFleetFixture,
  inspectionCreateBody,
  seedHttpFleetFixture,
} from './helpers/http-test.fixture';

describe('Inspections HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: HttpFleetFixture;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    fixture = await seedHttpFleetFixture(env, 'inspections-http');
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/inspections create',
      method: 'post',
      path: '/inspections',
      permission: { resource: 'maintenance', action: 'write' },
      body: (ctx) => inspectionCreateBody(ctx),
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/inspections list',
      method: 'get',
      path: '/inspections',
      permission: { resource: 'maintenance', action: 'read' },
    },
  );
});

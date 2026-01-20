import {
  HttpTestEnv,
  bootstrapHttpTestEnv,
  prepareHttpTestDatabase,
  registerProtectedEndpointRbacTests,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import {
  HttpFleetFixture,
  createNotificationForUser,
  seedHttpFleetFixture,
} from './helpers/http-test.fixture';

describe('Notifications HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: HttpFleetFixture;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    fixture = await seedHttpFleetFixture(env, 'notifications-http');
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/notifications list',
      method: 'get',
      path: '/notifications',
      permission: { resource: 'notifications', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/notifications/unread list',
      method: 'get',
      path: '/notifications/unread',
      permission: { resource: 'notifications', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/notifications/:notificationId/read',
      method: 'post',
      path: (ctx) => `/notifications/${ctx.notification.id}/read`,
      permission: { resource: 'notifications', action: 'write' },
      successStatus: 200,
      onAuthorizedUser: async (ctx, user) => {
        ctx.notification = await createNotificationForUser(env, ctx.organization.id, user.id);
        return ctx;
      },
      onAdminUser: async (ctx, user) => {
        ctx.notification = await createNotificationForUser(env, ctx.organization.id, user.id);
        return ctx;
      },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/notifications/read-all',
      method: 'post',
      path: '/notifications/read-all',
      permission: { resource: 'notifications', action: 'write' },
      successStatus: 200,
      onAuthorizedUser: async (ctx, user) => {
        await createNotificationForUser(env, ctx.organization.id, user.id);
        return ctx;
      },
      onAdminUser: async (ctx, user) => {
        await createNotificationForUser(env, ctx.organization.id, user.id);
        return ctx;
      },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/notification-preferences get',
      method: 'get',
      path: '/notification-preferences',
      permission: { resource: 'notifications', action: 'read' },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/notification-preferences patch',
      method: 'patch',
      path: '/notification-preferences',
      permission: { resource: 'notifications', action: 'write' },
      body: { tripNotifications: false },
    },
  );
});

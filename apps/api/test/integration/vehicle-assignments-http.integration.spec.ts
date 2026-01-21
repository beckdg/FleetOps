import {
  HttpTestEnv,
  bootstrapHttpTestEnv,
  prepareHttpTestDatabase,
  registerProtectedEndpointRbacTests,
  registerRequireAllPermissionsTests,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import {
  HttpFleetFixture,
  createFreshActiveAssignment,
  createFreshAssignablePair,
  seedHttpFleetFixture,
} from './helpers/http-test.fixture';

describe('Vehicle assignments HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: HttpFleetFixture;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    fixture = await seedHttpFleetFixture(env, 'assignments-http');
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/vehicle-assignments create',
      method: 'post',
      path: '/vehicle-assignments',
      permission: { resource: 'vehicles', action: 'write' },
      permissions: [
        { resource: 'vehicles', action: 'write' },
        { resource: 'drivers', action: 'write' },
      ],
      body: (ctx) => ({
        vehicleId: ctx.assignableVehicle.id,
        driverId: ctx.assignableDriver.id,
      }),
      prepareAuthorizedContext: async (ctx) => {
        const pair = await createFreshAssignablePair(env, ctx);
        ctx.assignableVehicle = { id: pair.vehicleId };
        ctx.assignableDriver = { id: pair.driverId };
        return ctx;
      },
      prepareAdminContext: async (ctx) => {
        const pair = await createFreshAssignablePair(env, ctx);
        ctx.assignableVehicle = { id: pair.vehicleId };
        ctx.assignableDriver = { id: pair.driverId };
        return ctx;
      },
    },
  );

  registerRequireAllPermissionsTests(
    () => env,
    () => fixture,
    {
      label: '/vehicle-assignments create',
      method: 'post',
      path: '/vehicle-assignments',
      permissions: [
        { resource: 'vehicles', action: 'write' },
        { resource: 'drivers', action: 'write' },
      ],
      prepareAuthorizedContext: async (ctx) => {
        const pair = await createFreshAssignablePair(env, ctx);
        ctx.assignableVehicle = { id: pair.vehicleId };
        ctx.assignableDriver = { id: pair.driverId };
        return ctx;
      },
      body: (ctx) => ({
        vehicleId: ctx.assignableVehicle.id,
        driverId: ctx.assignableDriver.id,
      }),
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/vehicle-assignments/:assignmentId/end',
      method: 'post',
      path: (ctx) => `/vehicle-assignments/${ctx.activeAssignment.id}/end`,
      permission: { resource: 'vehicles', action: 'write' },
      permissions: [
        { resource: 'vehicles', action: 'write' },
        { resource: 'drivers', action: 'write' },
      ],
      successStatus: 200,
      prepareAuthorizedContext: async (ctx) => {
        const assignment = await createFreshActiveAssignment(env, ctx);
        ctx.activeAssignment = { ...ctx.activeAssignment, id: assignment.id };
        return ctx;
      },
      prepareAdminContext: async (ctx) => {
        const assignment = await createFreshActiveAssignment(env, ctx);
        ctx.activeAssignment = { ...ctx.activeAssignment, id: assignment.id };
        return ctx;
      },
    },
  );

  registerRequireAllPermissionsTests(
    () => env,
    () => fixture,
    {
      label: '/vehicle-assignments/:assignmentId/end',
      method: 'post',
      path: (ctx) => `/vehicle-assignments/${ctx.activeAssignment.id}/end`,
      permissions: [
        { resource: 'vehicles', action: 'write' },
        { resource: 'drivers', action: 'write' },
      ],
      successStatus: 200,
      prepareAuthorizedContext: async (ctx) => {
        const assignment = await createFreshActiveAssignment(env, ctx);
        ctx.activeAssignment = { ...ctx.activeAssignment, id: assignment.id };
        return ctx;
      },
    },
  );

  registerProtectedEndpointRbacTests(
    () => env,
    () => fixture,
    {
      label: '/vehicle-assignments/active get',
      method: 'get',
      path: '/vehicle-assignments/active',
      permission: { resource: 'vehicles', action: 'read' },
      permissions: [
        { resource: 'vehicles', action: 'read' },
        { resource: 'drivers', action: 'read' },
      ],
      query: (ctx) => ({ vehicleId: ctx.activeAssignment.vehicleId }),
    },
  );

  registerRequireAllPermissionsTests(
    () => env,
    () => fixture,
    {
      label: '/vehicle-assignments/active get',
      method: 'get',
      path: '/vehicle-assignments/active',
      permissions: [
        { resource: 'vehicles', action: 'read' },
        { resource: 'drivers', action: 'read' },
      ],
      query: (ctx) => ({ vehicleId: ctx.activeAssignment.vehicleId }),
      successStatus: 200,
    },
  );
});

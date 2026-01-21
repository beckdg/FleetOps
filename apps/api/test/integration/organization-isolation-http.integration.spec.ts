import request from 'supertest';
import { DriverStatus, VehicleStatus } from '@prisma/client';

import {
  HttpTestEnv,
  apiPath,
  assignPermissionsToUser,
  bootstrapHttpTestEnv,
  createAuthenticatedUser,
  createUser,
  expectCrossOrganizationDenied,
  login,
  prepareHttpTestDatabase,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import {
  DualOrgFixture,
  fuelRecordCreateBody,
  inspectionCreateBody,
  maintenanceCreateBody,
  seedDualOrganizationFixture,
  tripCreateBody,
} from './helpers/http-test.fixture';

describe('Organization isolation HTTP (integration)', () => {
  let env: HttpTestEnv;
  let fixture: DualOrgFixture;
  let allPermissionsToken: string;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
    fixture = await seedDualOrganizationFixture(env);

    const user = await createUser(env, fixture.orgA.organization.id, 'isolation-user@http.test');
    await assignPermissionsToUser(env, fixture.orgA.organization.id, user.id, [
      { resource: 'vehicles', action: 'read' },
      { resource: 'vehicles', action: 'write' },
      { resource: 'drivers', action: 'read' },
      { resource: 'drivers', action: 'write' },
      { resource: 'trips', action: 'read' },
      { resource: 'trips', action: 'write' },
      { resource: 'maintenance', action: 'read' },
      { resource: 'maintenance', action: 'write' },
      { resource: 'fuel', action: 'read' },
      { resource: 'fuel', action: 'write' },
      { resource: 'notifications', action: 'read' },
      { resource: 'notifications', action: 'write' },
      { resource: 'reports', action: 'read' },
    ]);

    allPermissionsToken = await login(
      env,
      fixture.orgA.organization.slug,
      'isolation-user@http.test',
    );
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  describe('cross-organization read access', () => {
    it('denies reading another organization vehicle', async () => {
      await expectCrossOrganizationDenied(
        env,
        allPermissionsToken,
        'get',
        `/vehicles/${fixture.orgB.vehicle.id}`,
      );
    });

    it('denies reading another organization driver', async () => {
      await expectCrossOrganizationDenied(
        env,
        allPermissionsToken,
        'get',
        `/drivers/${fixture.orgB.driver.id}`,
      );
    });

    it('does not return another organization active assignment', async () => {
      const response = await request(env.app.getHttpServer())
        .get(apiPath('/vehicle-assignments/active'))
        .query({ vehicleId: fixture.orgB.vehicle.id })
        .set('Authorization', `Bearer ${allPermissionsToken}`)
        .expect(200);

      expect(response.body).toBeNull();
    });

    it('denies reading another organization fuel summary', async () => {
      await expectCrossOrganizationDenied(
        env,
        allPermissionsToken,
        'get',
        `/fuel/vehicles/${fixture.orgB.fuelVehicle.id}/summary`,
      );
    });
  });

  describe('cross-organization modifications', () => {
    it('denies updating another organization vehicle status', async () => {
      await expectCrossOrganizationDenied(
        env,
        allPermissionsToken,
        'patch',
        `/vehicles/${fixture.orgB.vehicle.id}/status`,
        { status: VehicleStatus.IN_MAINTENANCE },
      );
    });

    it('denies updating another organization driver status', async () => {
      await expectCrossOrganizationDenied(
        env,
        allPermissionsToken,
        'patch',
        `/drivers/${fixture.orgB.driver.id}/status`,
        { status: DriverStatus.SUSPENDED },
      );
    });

    it('denies assigning another organization vehicle and driver', async () => {
      await expectCrossOrganizationDenied(
        env,
        allPermissionsToken,
        'post',
        '/vehicle-assignments',
        {
          vehicleId: fixture.orgB.assignableVehicle.id,
          driverId: fixture.orgB.assignableDriver.id,
        },
      );
    });

    it('denies ending another organization assignment', async () => {
      await expectCrossOrganizationDenied(
        env,
        allPermissionsToken,
        'post',
        `/vehicle-assignments/${fixture.orgB.activeAssignment.id}/end`,
      );
    });

    it('denies dispatching another organization trip', async () => {
      await expectCrossOrganizationDenied(
        env,
        allPermissionsToken,
        'post',
        `/trips/${fixture.orgB.plannedTrip.id}/dispatch`,
        {},
      );
    });

    it('denies creating a trip with another organization resources', async () => {
      await expectCrossOrganizationDenied(
        env,
        allPermissionsToken,
        'post',
        '/trips',
        tripCreateBody(
          fixture.orgA,
          `${Date.now()}`,
          fixture.orgB.vehicle.id,
          fixture.orgB.driver.id,
        ),
      );
    });

    it('denies starting another organization maintenance', async () => {
      await expectCrossOrganizationDenied(
        env,
        allPermissionsToken,
        'post',
        `/maintenance/${fixture.orgB.scheduledMaintenance.id}/start`,
        {},
      );
    });

    it('denies scheduling maintenance for another organization vehicle', async () => {
      await expectCrossOrganizationDenied(env, allPermissionsToken, 'post', '/maintenance', {
        ...maintenanceCreateBody(fixture.orgA),
        vehicleId: fixture.orgB.vehicle.id,
      });
    });

    it('denies creating an inspection for another organization vehicle', async () => {
      await expectCrossOrganizationDenied(env, allPermissionsToken, 'post', '/inspections', {
        ...inspectionCreateBody(fixture.orgA),
        vehicleId: fixture.orgB.vehicle.id,
      });
    });

    it('denies creating a fuel record for another organization vehicle', async () => {
      await expectCrossOrganizationDenied(env, allPermissionsToken, 'post', '/fuel/records', {
        ...fuelRecordCreateBody(fixture.orgA),
        vehicleId: fixture.orgB.fuelVehicle.id,
        fuelStationId: fixture.orgB.fuelStation.id,
      });
    });

    it('denies marking another organization notification as read', async () => {
      await expectCrossOrganizationDenied(
        env,
        allPermissionsToken,
        'post',
        `/notifications/${fixture.orgB.notification.id}/read`,
      );
    });
  });

  describe('organization-scoped listings remain isolated', () => {
    it('does not expose another organization vehicles in list results', async () => {
      const { token } = await createAuthenticatedUser(
        env,
        fixture.orgA.organization.id,
        fixture.orgA.organization.slug,
        'vehicles-list-isolation@http.test',
        [{ resource: 'vehicles', action: 'read' }],
      );

      const listResponse = await request(env.app.getHttpServer())
        .get(apiPath('/vehicles'))
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      const vehicleIds = listResponse.body.map((vehicle: { id: string }) => vehicle.id);
      expect(vehicleIds).toContain(fixture.orgA.vehicle.id);
      expect(vehicleIds).not.toContain(fixture.orgB.vehicle.id);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { DriverStatus, VehicleStatus } from '@prisma/client';

import { OrganizationService } from '../../src/organizations/organizations.service';
import { PrismaService } from '../../src/database/prisma.service';
import { UserService } from '../../src/users/users.service';
import { DriverService } from '../../src/drivers/drivers.service';
import { VehicleAssignmentService } from '../../src/vehicle-assignments/vehicle-assignments.service';
import { VehicleService } from '../../src/vehicles/vehicles.service';
import { FleetTestModule } from './fleet-test.module';
import { resetDatabase } from './helpers/database.helper';

describe('Fleet domain (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let userService: UserService;
  let vehicleService: VehicleService;
  let driverService: DriverService;
  let vehicleAssignmentService: VehicleAssignmentService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [FleetTestModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    userService = moduleRef.get(UserService);
    vehicleService = moduleRef.get(VehicleService);
    driverService = moduleRef.get(DriverService);
    vehicleAssignmentService = moduleRef.get(VehicleAssignmentService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleRef.close();
  });

  async function seedFleetContext() {
    const organization = await organizationService.createOrganization({
      name: 'Fleet Org',
      slug: 'fleet-org',
    });

    const actor = await userService.createUser({
      organizationId: organization.id,
      email: 'dispatcher@fleet-org.test',
      password: 'StrongPassword123!',
      firstName: 'Dispatch',
      lastName: 'Lead',
    });

    return { organization, actor };
  }

  async function createActiveVehicle(organizationId: string, plateSuffix: string) {
    return vehicleService.createVehicle({
      organizationId,
      plateNumber: `FLT-${plateSuffix}`,
      vin: `1FTBR1C85PKA${plateSuffix.padStart(5, '0')}`,
      make: 'Ford',
      model: 'Transit',
      year: 2022,
    });
  }

  async function createActiveDriver(organizationId: string, employeeSuffix: string) {
    return driverService.createDriver({
      organizationId,
      employeeId: `EMP-${employeeSuffix}`,
      firstName: 'Driver',
      lastName: employeeSuffix,
      licenseNumber: `LIC-${employeeSuffix}`,
      licenseExpiryDate: '2028-01-01',
    });
  }

  it('assigns an active vehicle to an active driver', async () => {
    const { organization, actor } = await seedFleetContext();
    const vehicle = await createActiveVehicle(organization.id, '101');
    const driver = await createActiveDriver(organization.id, '101');

    const assignment = await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      assignedByUserId: actor.id,
    });

    expect(assignment.vehicleId).toBe(vehicle.id);
    expect(assignment.driverId).toBe(driver.id);
    expect(assignment.endedAt).toBeNull();

    const active = await vehicleAssignmentService.getActiveAssignment({
      organizationId: organization.id,
      vehicleId: vehicle.id,
    });

    expect(active?.id).toBe(assignment.id);
  });

  it('rejects assigning a vehicle that already has an active assignment', async () => {
    const { organization, actor } = await seedFleetContext();
    const vehicle = await createActiveVehicle(organization.id, '102');
    const driverA = await createActiveDriver(organization.id, '102A');
    const driverB = await createActiveDriver(organization.id, '102B');

    await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      driverId: driverA.id,
      assignedByUserId: actor.id,
    });

    await expect(
      vehicleAssignmentService.assignVehicleToDriver({
        organizationId: organization.id,
        vehicleId: vehicle.id,
        driverId: driverB.id,
        assignedByUserId: actor.id,
      }),
    ).rejects.toMatchObject({ message: 'Vehicle already has an active assignment' });
  });

  it('rejects assigning a driver that already has an active assignment', async () => {
    const { organization, actor } = await seedFleetContext();
    const vehicleA = await createActiveVehicle(organization.id, '103A');
    const vehicleB = await createActiveVehicle(organization.id, '103B');
    const driver = await createActiveDriver(organization.id, '103');

    await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: organization.id,
      vehicleId: vehicleA.id,
      driverId: driver.id,
      assignedByUserId: actor.id,
    });

    await expect(
      vehicleAssignmentService.assignVehicleToDriver({
        organizationId: organization.id,
        vehicleId: vehicleB.id,
        driverId: driver.id,
        assignedByUserId: actor.id,
      }),
    ).rejects.toMatchObject({ message: 'Driver already has an active assignment' });
  });

  it('rejects assigning a suspended driver', async () => {
    const { organization, actor } = await seedFleetContext();
    const vehicle = await createActiveVehicle(organization.id, '104');
    const driver = await createActiveDriver(organization.id, '104');

    await driverService.updateDriverStatus({
      organizationId: organization.id,
      driverId: driver.id,
      status: DriverStatus.SUSPENDED,
      changedByUserId: actor.id,
    });

    await expect(
      vehicleAssignmentService.assignVehicleToDriver({
        organizationId: organization.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        assignedByUserId: actor.id,
      }),
    ).rejects.toMatchObject({
      message: 'Driver cannot be assigned while status is SUSPENDED',
    });
  });

  it('rejects assigning a vehicle in maintenance', async () => {
    const { organization, actor } = await seedFleetContext();
    const vehicle = await createActiveVehicle(organization.id, '105');
    const driver = await createActiveDriver(organization.id, '105');

    await vehicleService.updateVehicleStatus({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      status: VehicleStatus.IN_MAINTENANCE,
      changedByUserId: actor.id,
    });

    await expect(
      vehicleAssignmentService.assignVehicleToDriver({
        organizationId: organization.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        assignedByUserId: actor.id,
      }),
    ).rejects.toMatchObject({
      message: 'Vehicle cannot be assigned while status is IN_MAINTENANCE',
    });
  });

  it('ends an active assignment and clears active lookup', async () => {
    const { organization, actor } = await seedFleetContext();
    const vehicle = await createActiveVehicle(organization.id, '106');
    const driver = await createActiveDriver(organization.id, '106');

    const assignment = await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      assignedByUserId: actor.id,
    });

    const ended = await vehicleAssignmentService.endAssignment({
      organizationId: organization.id,
      assignmentId: assignment.id,
      endedByUserId: actor.id,
    });

    expect(ended.endedAt).not.toBeNull();

    const active = await vehicleAssignmentService.getActiveAssignment({
      organizationId: organization.id,
      vehicleId: vehicle.id,
    });

    expect(active).toBeNull();
  });

  it('denies cross-organization assignment lookups', async () => {
    const orgA = await organizationService.createOrganization({ name: 'Org A', slug: 'org-a' });
    const orgB = await organizationService.createOrganization({ name: 'Org B', slug: 'org-b' });
    const actor = await userService.createUser({
      organizationId: orgA.id,
      email: 'actor@org-a.test',
      password: 'StrongPassword123!',
      firstName: 'Actor',
      lastName: 'A',
    });
    const vehicle = await createActiveVehicle(orgA.id, '107');
    const driver = await createActiveDriver(orgA.id, '107');

    const assignment = await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: orgA.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      assignedByUserId: actor.id,
    });

    const crossOrgLookup = await vehicleAssignmentService.getActiveAssignment({
      organizationId: orgB.id,
      vehicleId: vehicle.id,
    });

    expect(crossOrgLookup).toBeNull();
    expect(assignment.organizationId).toBe(orgA.id);
  });
});

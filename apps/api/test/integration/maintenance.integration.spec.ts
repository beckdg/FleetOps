import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceStatus, VehicleStatus } from '@prisma/client';

import { DriverService } from '../../src/drivers/drivers.service';
import { InspectionService } from '../../src/inspections/inspections.service';
import { MaintenanceService } from '../../src/maintenance/maintenance.service';
import { OrganizationService } from '../../src/organizations/organizations.service';
import { PrismaService } from '../../src/database/prisma.service';
import { TripService } from '../../src/trips/trips.service';
import { UserService } from '../../src/users/users.service';
import { VehicleAssignmentService } from '../../src/vehicle-assignments/vehicle-assignments.service';
import { VehicleService } from '../../src/vehicles/vehicles.service';
import { MaintenanceTestModule } from './maintenance-test.module';
import { resetDatabase } from './helpers/database.helper';

describe('Maintenance domain (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let userService: UserService;
  let vehicleService: VehicleService;
  let driverService: DriverService;
  let vehicleAssignmentService: VehicleAssignmentService;
  let maintenanceService: MaintenanceService;
  let inspectionService: InspectionService;
  let tripService: TripService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [MaintenanceTestModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    userService = moduleRef.get(UserService);
    vehicleService = moduleRef.get(VehicleService);
    driverService = moduleRef.get(DriverService);
    vehicleAssignmentService = moduleRef.get(VehicleAssignmentService);
    maintenanceService = moduleRef.get(MaintenanceService);
    inspectionService = moduleRef.get(InspectionService);
    tripService = moduleRef.get(TripService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleRef.close();
  });

  async function seedContext() {
    const organization = await organizationService.createOrganization({
      name: 'Maintenance Org',
      slug: 'maintenance-org',
    });

    const actor = await userService.createUser({
      organizationId: organization.id,
      email: 'mechanic@maintenance-org.test',
      password: 'StrongPassword123!',
      firstName: 'Fleet',
      lastName: 'Mechanic',
    });

    const vehicle = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: 'MNT-1001',
      vin: '1FTBR1C85PKM00001',
      make: 'Ford',
      model: 'Transit',
      year: 2022,
    });

    const driver = await driverService.createDriver({
      organizationId: organization.id,
      employeeId: 'MNT-DRV-001',
      firstName: 'Trip',
      lastName: 'Driver',
      licenseNumber: 'MNT-LIC-001',
      licenseExpiryDate: '2028-01-01',
    });

    await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      assignedByUserId: actor.id,
    });

    return { organization, actor, vehicle, driver };
  }

  it('runs maintenance lifecycle and syncs vehicle status', async () => {
    const { organization, actor, vehicle } = await seedContext();

    const scheduled = await maintenanceService.scheduleMaintenance({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      title: 'Oil change',
      maintenanceType: 'PREVENTIVE',
      scheduledAt: '2025-06-15T09:00:00.000Z',
      createdByUserId: actor.id,
    });

    expect(scheduled.status).toBe(MaintenanceStatus.SCHEDULED);

    const started = await maintenanceService.startMaintenance({
      organizationId: organization.id,
      maintenanceId: scheduled.id,
      actorUserId: actor.id,
    });

    expect(started.status).toBe(MaintenanceStatus.IN_PROGRESS);

    const vehicleInMaintenance = await prisma.vehicle.findUnique({
      where: { id: vehicle.id },
    });
    expect(vehicleInMaintenance?.status).toBe(VehicleStatus.IN_MAINTENANCE);

    const completed = await maintenanceService.completeMaintenance({
      organizationId: organization.id,
      maintenanceId: scheduled.id,
      actorUserId: actor.id,
      actualCost: '125.00',
    });

    expect(completed.status).toBe(MaintenanceStatus.COMPLETED);

    const vehicleActive = await prisma.vehicle.findUnique({ where: { id: vehicle.id } });
    expect(vehicleActive?.status).toBe(VehicleStatus.ACTIVE);

    const events = await prisma.maintenanceEvent.findMany({
      where: { maintenanceRecordId: scheduled.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(events.map((event) => event.eventType)).toEqual([
      'MAINTENANCE_SCHEDULED',
      'MAINTENANCE_STARTED',
      'MAINTENANCE_COMPLETED',
    ]);
  });

  it('prevents multiple in-progress maintenance records for one vehicle', async () => {
    const { organization, actor, vehicle } = await seedContext();

    const first = await maintenanceService.scheduleMaintenance({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      title: 'Brake repair',
      maintenanceType: 'CORRECTIVE',
      scheduledAt: '2025-06-16T09:00:00.000Z',
      createdByUserId: actor.id,
    });

    await maintenanceService.startMaintenance({
      organizationId: organization.id,
      maintenanceId: first.id,
      actorUserId: actor.id,
    });

    const second = await maintenanceService.scheduleMaintenance({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      title: 'Tire rotation',
      maintenanceType: 'PREVENTIVE',
      scheduledAt: '2025-06-17T09:00:00.000Z',
      createdByUserId: actor.id,
    });

    await expect(
      maintenanceService.startMaintenance({
        organizationId: organization.id,
        maintenanceId: second.id,
        actorUserId: actor.id,
      }),
    ).rejects.toMatchObject({ message: 'Vehicle already has maintenance in progress' });
  });

  it('restores vehicle to active when in-progress maintenance is cancelled', async () => {
    const { organization, actor, vehicle } = await seedContext();

    const maintenance = await maintenanceService.scheduleMaintenance({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      title: 'Engine diagnostics',
      maintenanceType: 'CORRECTIVE',
      scheduledAt: '2025-06-18T09:00:00.000Z',
      createdByUserId: actor.id,
    });

    await maintenanceService.startMaintenance({
      organizationId: organization.id,
      maintenanceId: maintenance.id,
      actorUserId: actor.id,
    });

    await maintenanceService.cancelMaintenance({
      organizationId: organization.id,
      maintenanceId: maintenance.id,
      actorUserId: actor.id,
    });

    const vehicleActive = await prisma.vehicle.findUnique({ where: { id: vehicle.id } });
    expect(vehicleActive?.status).toBe(VehicleStatus.ACTIVE);
  });

  it('creates failed inspections and records them', async () => {
    const { organization, actor, vehicle } = await seedContext();

    const inspection = await inspectionService.createInspection({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      inspectionDate: '2025-06-01',
      passed: false,
      notes: 'Brake lights not functioning',
      inspectorName: 'Safety Inspector',
      createdByUserId: actor.id,
    });

    expect(inspection.passed).toBe(false);
    expect(inspection.notes).toBe('Brake lights not functioning');
  });

  it('blocks trip creation while vehicle is in maintenance', async () => {
    const { organization, actor, vehicle, driver } = await seedContext();

    const maintenance = await maintenanceService.scheduleMaintenance({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      title: 'Transmission service',
      maintenanceType: 'CORRECTIVE',
      scheduledAt: '2025-06-20T09:00:00.000Z',
      createdByUserId: actor.id,
    });

    await maintenanceService.startMaintenance({
      organizationId: organization.id,
      maintenanceId: maintenance.id,
      actorUserId: actor.id,
    });

    await expect(
      tripService.createTrip({
        organizationId: organization.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        tripNumber: 'TRIP-BLOCKED-001',
        origin: 'Origin',
        destination: 'Destination',
        scheduledStartAt: '2025-06-21T08:00:00.000Z',
        scheduledEndAt: '2025-06-21T12:00:00.000Z',
        createdByUserId: actor.id,
      }),
    ).rejects.toMatchObject({
      message: 'Vehicle cannot start a new trip while in maintenance',
    });
  });

  it('cancels scheduled maintenance', async () => {
    const { organization, actor, vehicle } = await seedContext();

    const scheduled = await maintenanceService.scheduleMaintenance({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      title: 'Cancelled work',
      maintenanceType: 'EMERGENCY',
      scheduledAt: '2025-06-22T09:00:00.000Z',
      createdByUserId: actor.id,
    });

    const cancelled = await maintenanceService.cancelMaintenance({
      organizationId: organization.id,
      maintenanceId: scheduled.id,
      actorUserId: actor.id,
    });

    expect(cancelled.status).toBe(MaintenanceStatus.CANCELLED);
  });
});

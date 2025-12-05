import { Test, TestingModule } from '@nestjs/testing';
import { TripStatus } from '@prisma/client';

import { DriverService } from '../../src/drivers/drivers.service';
import { OrganizationService } from '../../src/organizations/organizations.service';
import { PrismaService } from '../../src/database/prisma.service';
import { TripService } from '../../src/trips/trips.service';
import { UserService } from '../../src/users/users.service';
import { VehicleAssignmentService } from '../../src/vehicle-assignments/vehicle-assignments.service';
import { VehicleService } from '../../src/vehicles/vehicles.service';
import { TripsTestModule } from './trips-test.module';
import { resetDatabase } from './helpers/database.helper';

describe('Trips domain (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let userService: UserService;
  let vehicleService: VehicleService;
  let driverService: DriverService;
  let vehicleAssignmentService: VehicleAssignmentService;
  let tripService: TripService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TripsTestModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    userService = moduleRef.get(UserService);
    vehicleService = moduleRef.get(VehicleService);
    driverService = moduleRef.get(DriverService);
    vehicleAssignmentService = moduleRef.get(VehicleAssignmentService);
    tripService = moduleRef.get(TripService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleRef.close();
  });

  async function seedTripContext() {
    const organization = await organizationService.createOrganization({
      name: 'Trips Org',
      slug: 'trips-org',
    });

    const dispatcher = await userService.createUser({
      organizationId: organization.id,
      email: 'dispatcher@trips-org.test',
      password: 'StrongPassword123!',
      firstName: 'Trip',
      lastName: 'Dispatcher',
    });

    const vehicle = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: 'TRP-1001',
      vin: '1FTBR1C85PKT00001',
      make: 'Ford',
      model: 'Transit',
      year: 2022,
    });

    const driver = await driverService.createDriver({
      organizationId: organization.id,
      employeeId: 'TRP-DRV-001',
      firstName: 'Trip',
      lastName: 'Driver',
      licenseNumber: 'TRIP-LIC-001',
      licenseExpiryDate: '2028-01-01',
    });

    await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      assignedByUserId: dispatcher.id,
    });

    return { organization, dispatcher, vehicle, driver };
  }

  async function createPlannedTrip(
    organizationId: string,
    vehicleId: string,
    driverId: string,
    createdByUserId: string,
    tripNumber: string,
    scheduledStartAt: string,
    scheduledEndAt: string,
  ) {
    return tripService.createTrip({
      organizationId,
      vehicleId,
      driverId,
      tripNumber,
      origin: 'Origin City',
      destination: 'Destination City',
      scheduledStartAt,
      scheduledEndAt,
      createdByUserId,
    });
  }

  it('runs a successful trip lifecycle with events', async () => {
    const { organization, dispatcher, vehicle, driver } = await seedTripContext();

    const planned = await createPlannedTrip(
      organization.id,
      vehicle.id,
      driver.id,
      dispatcher.id,
      'TRIP-LIFE-001',
      '2025-06-10T08:00:00.000Z',
      '2025-06-10T12:00:00.000Z',
    );

    expect(planned.status).toBe(TripStatus.PLANNED);

    const dispatched = await tripService.dispatchTrip({
      organizationId: organization.id,
      tripId: planned.id,
      actorUserId: dispatcher.id,
    });
    expect(dispatched.status).toBe(TripStatus.DISPATCHED);

    const started = await tripService.startTrip({
      organizationId: organization.id,
      tripId: planned.id,
      actorUserId: dispatcher.id,
    });
    expect(started.status).toBe(TripStatus.IN_PROGRESS);
    expect(started.actualStartAt).not.toBeNull();

    const completed = await tripService.completeTrip({
      organizationId: organization.id,
      tripId: planned.id,
      actorUserId: dispatcher.id,
    });
    expect(completed.status).toBe(TripStatus.COMPLETED);
    expect(completed.actualEndAt).not.toBeNull();

    const events = await prisma.tripEvent.findMany({
      where: { tripId: planned.id },
      orderBy: { createdAt: 'asc' },
    });

    expect(events.map((event) => event.eventType)).toEqual([
      'TRIP_CREATED',
      'TRIP_DISPATCHED',
      'TRIP_STARTED',
      'TRIP_COMPLETED',
    ]);
  });

  it('rejects invalid status transitions', async () => {
    const { organization, dispatcher, vehicle, driver } = await seedTripContext();

    const planned = await createPlannedTrip(
      organization.id,
      vehicle.id,
      driver.id,
      dispatcher.id,
      'TRIP-INVALID-001',
      '2025-06-10T08:00:00.000Z',
      '2025-06-10T12:00:00.000Z',
    );

    await expect(
      tripService.startTrip({
        organizationId: organization.id,
        tripId: planned.id,
        actorUserId: dispatcher.id,
      }),
    ).rejects.toMatchObject({
      message: 'Invalid trip status transition from PLANNED to IN_PROGRESS',
    });
  });

  it('rejects overlapping trips for the same vehicle', async () => {
    const { organization, dispatcher, vehicle, driver } = await seedTripContext();

    await createPlannedTrip(
      organization.id,
      vehicle.id,
      driver.id,
      dispatcher.id,
      'TRIP-OVERLAP-V-001',
      '2025-06-10T08:00:00.000Z',
      '2025-06-10T12:00:00.000Z',
    );

    await expect(
      createPlannedTrip(
        organization.id,
        vehicle.id,
        driver.id,
        dispatcher.id,
        'TRIP-OVERLAP-V-002',
        '2025-06-10T10:00:00.000Z',
        '2025-06-10T14:00:00.000Z',
      ),
    ).rejects.toMatchObject({ message: 'Vehicle has an overlapping trip' });
  });

  it('rejects overlapping trips for the same driver', async () => {
    const { organization, dispatcher, vehicle, driver } = await seedTripContext();

    const vehicleTwo = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: 'TRP-1002',
      vin: '1FTBR1C85PKT00002',
      make: 'Ford',
      model: 'Transit',
      year: 2021,
    });

    await vehicleAssignmentService.endAssignment({
      organizationId: organization.id,
      assignmentId: (await vehicleAssignmentService.getActiveAssignment({
        organizationId: organization.id,
        vehicleId: vehicle.id,
      }))!.id,
      endedByUserId: dispatcher.id,
    });

    await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: organization.id,
      vehicleId: vehicleTwo.id,
      driverId: driver.id,
      assignedByUserId: dispatcher.id,
    });

    await createPlannedTrip(
      organization.id,
      vehicle.id,
      driver.id,
      dispatcher.id,
      'TRIP-OVERLAP-D-001',
      '2025-06-10T08:00:00.000Z',
      '2025-06-10T12:00:00.000Z',
    );

    await expect(
      createPlannedTrip(
        organization.id,
        vehicleTwo.id,
        driver.id,
        dispatcher.id,
        'TRIP-OVERLAP-D-002',
        '2025-06-10T10:00:00.000Z',
        '2025-06-10T14:00:00.000Z',
      ),
    ).rejects.toMatchObject({ message: 'Driver has an overlapping trip' });
  });

  it('cancels a planned trip and records a cancellation event', async () => {
    const { organization, dispatcher, vehicle, driver } = await seedTripContext();

    const planned = await createPlannedTrip(
      organization.id,
      vehicle.id,
      driver.id,
      dispatcher.id,
      'TRIP-CANCEL-001',
      '2025-06-10T08:00:00.000Z',
      '2025-06-10T12:00:00.000Z',
    );

    const cancelled = await tripService.cancelTrip({
      organizationId: organization.id,
      tripId: planned.id,
      actorUserId: dispatcher.id,
      notes: 'Customer cancelled order',
    });

    expect(cancelled.status).toBe(TripStatus.CANCELLED);

    const events = await prisma.tripEvent.findMany({ where: { tripId: planned.id } });
    expect(events.some((event) => event.eventType === 'TRIP_CANCELLED')).toBe(true);

    const activeTrips = await tripService.getActiveTrips(organization.id);
    expect(activeTrips.find((trip) => trip.id === planned.id)).toBeUndefined();
  });

  it('rejects trip creation when driver does not match active assignment', async () => {
    const { organization, dispatcher, vehicle } = await seedTripContext();

    const otherDriver = await driverService.createDriver({
      organizationId: organization.id,
      employeeId: 'TRP-DRV-002',
      firstName: 'Other',
      lastName: 'Driver',
      licenseNumber: 'TRIP-LIC-002',
      licenseExpiryDate: '2028-01-01',
    });

    await expect(
      createPlannedTrip(
        organization.id,
        vehicle.id,
        otherDriver.id,
        dispatcher.id,
        'TRIP-MISMATCH-001',
        '2025-06-10T08:00:00.000Z',
        '2025-06-10T12:00:00.000Z',
      ),
    ).rejects.toMatchObject({
      message: 'Trip driver does not match the active vehicle assignment',
    });
  });
});

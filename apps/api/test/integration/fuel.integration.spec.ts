import { Test, TestingModule } from '@nestjs/testing';

import { DriverService } from '../../src/drivers/drivers.service';
import { FuelRecordService } from '../../src/fuel/fuel-records.service';
import { FuelStationService } from '../../src/fuel/fuel-stations.service';
import { OrganizationService } from '../../src/organizations/organizations.service';
import { PrismaService } from '../../src/database/prisma.service';
import { TripService } from '../../src/trips/trips.service';
import { UserService } from '../../src/users/users.service';
import { VehicleAssignmentService } from '../../src/vehicle-assignments/vehicle-assignments.service';
import { VehicleService } from '../../src/vehicles/vehicles.service';
import { FuelTestModule } from './fuel-test.module';
import { resetDatabase } from './helpers/database.helper';

describe('Fuel domain (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let userService: UserService;
  let vehicleService: VehicleService;
  let driverService: DriverService;
  let vehicleAssignmentService: VehicleAssignmentService;
  let tripService: TripService;
  let fuelRecordService: FuelRecordService;
  let fuelStationService: FuelStationService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [FuelTestModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    userService = moduleRef.get(UserService);
    vehicleService = moduleRef.get(VehicleService);
    driverService = moduleRef.get(DriverService);
    vehicleAssignmentService = moduleRef.get(VehicleAssignmentService);
    tripService = moduleRef.get(TripService);
    fuelRecordService = moduleRef.get(FuelRecordService);
    fuelStationService = moduleRef.get(FuelStationService);
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
      name: 'Fuel Org',
      slug: 'fuel-org',
    });

    const actor = await userService.createUser({
      organizationId: organization.id,
      email: 'fuel@fuel-org.test',
      password: 'StrongPassword123!',
      firstName: 'Fuel',
      lastName: 'Manager',
    });

    const vehicle = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: 'FUEL-1001',
      vin: '1FTBR1C85PKF00001',
      make: 'Ford',
      model: 'Transit',
      year: 2022,
    });

    const driver = await driverService.createDriver({
      organizationId: organization.id,
      employeeId: 'FUEL-DRV-001',
      firstName: 'Road',
      lastName: 'Runner',
      licenseNumber: 'FUEL-LIC-001',
      licenseExpiryDate: '2028-01-01',
    });

    await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      assignedByUserId: actor.id,
    });

    const trip = await tripService.createTrip({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      tripNumber: 'FUEL-TRIP-001',
      origin: 'Origin',
      destination: 'Destination',
      scheduledStartAt: '2025-06-10T08:00:00.000Z',
      scheduledEndAt: '2025-06-10T12:00:00.000Z',
      createdByUserId: actor.id,
    });

    const station = await fuelStationService.createFuelStation({
      organizationId: organization.id,
      name: 'Test Station',
      location: '123 Fuel Lane',
    });

    return { organization, actor, vehicle, driver, trip, station };
  }

  it('creates fuel records with server-calculated total cost', async () => {
    const { organization, actor, vehicle, station } = await seedContext();

    const record = await fuelRecordService.createFuelRecord({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      fuelStationId: station.id,
      odometerReading: 10000,
      litersPurchased: '65.500',
      pricePerLiter: '1.8500',
      filledAt: '2025-06-09T08:00:00.000Z',
      createdByUserId: actor.id,
    });

    expect(record.totalCost).toBe('121.18');
    expect(record.litersPurchased).toBe('65.5');
  });

  it('rejects odometer regression for the same vehicle', async () => {
    const { organization, actor, vehicle } = await seedContext();

    await fuelRecordService.createFuelRecord({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      odometerReading: 10000,
      litersPurchased: '50.000',
      pricePerLiter: '1.8000',
      filledAt: '2025-06-09T08:00:00.000Z',
      createdByUserId: actor.id,
    });

    await expect(
      fuelRecordService.createFuelRecord({
        organizationId: organization.id,
        vehicleId: vehicle.id,
        odometerReading: 9999,
        litersPurchased: '50.000',
        pricePerLiter: '1.8000',
        filledAt: '2025-06-10T08:00:00.000Z',
        createdByUserId: actor.id,
      }),
    ).rejects.toMatchObject({
      message: 'Odometer reading cannot decrease (previous: 10000, new: 9999)',
    });
  });

  it('rejects trip from another organization', async () => {
    const { organization, actor, vehicle } = await seedContext();

    const otherOrg = await organizationService.createOrganization({
      name: 'Other Org',
      slug: 'other-org',
    });

    const otherUser = await userService.createUser({
      organizationId: otherOrg.id,
      email: 'other@other-org.test',
      password: 'StrongPassword123!',
      firstName: 'Other',
      lastName: 'User',
    });

    const otherVehicle = await vehicleService.createVehicle({
      organizationId: otherOrg.id,
      plateNumber: 'OTHER-1001',
      vin: '1FTBR1C85PKO00001',
      make: 'Ford',
      model: 'Transit',
      year: 2022,
    });

    const otherDriver = await driverService.createDriver({
      organizationId: otherOrg.id,
      employeeId: 'OTHER-DRV-001',
      firstName: 'Other',
      lastName: 'Driver',
      licenseNumber: 'OTHER-LIC-001',
      licenseExpiryDate: '2028-01-01',
    });

    await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: otherOrg.id,
      vehicleId: otherVehicle.id,
      driverId: otherDriver.id,
      assignedByUserId: otherUser.id,
    });

    const otherTrip = await tripService.createTrip({
      organizationId: otherOrg.id,
      vehicleId: otherVehicle.id,
      driverId: otherDriver.id,
      tripNumber: 'OTHER-TRIP-001',
      origin: 'A',
      destination: 'B',
      scheduledStartAt: '2025-06-10T08:00:00.000Z',
      scheduledEndAt: '2025-06-10T12:00:00.000Z',
      createdByUserId: otherUser.id,
    });

    await expect(
      fuelRecordService.createFuelRecord({
        organizationId: organization.id,
        vehicleId: vehicle.id,
        tripId: otherTrip.id,
        odometerReading: 10000,
        litersPurchased: '50.000',
        pricePerLiter: '1.8000',
        filledAt: '2025-06-09T08:00:00.000Z',
        createdByUserId: actor.id,
      }),
    ).rejects.toMatchObject({
      message: 'Trip does not belong to the same organization',
    });
  });

  it('rejects trip linked to a different vehicle', async () => {
    const { organization, actor, trip } = await seedContext();

    const secondVehicle = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: 'FUEL-1002',
      vin: '1FTBR1C85PKF00002',
      make: 'Ford',
      model: 'Transit',
      year: 2023,
    });

    await expect(
      fuelRecordService.createFuelRecord({
        organizationId: organization.id,
        vehicleId: secondVehicle.id,
        tripId: trip.id,
        odometerReading: 10000,
        litersPurchased: '50.000',
        pricePerLiter: '1.8000',
        filledAt: '2025-06-09T08:00:00.000Z',
        createdByUserId: actor.id,
      }),
    ).rejects.toMatchObject({
      message: 'Trip does not belong to the specified vehicle',
    });
  });

  it('calculates vehicle fuel summary', async () => {
    const { organization, actor, vehicle, trip } = await seedContext();

    await fuelRecordService.createFuelRecord({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      tripId: trip.id,
      odometerReading: 10000,
      litersPurchased: '50.000',
      pricePerLiter: '1.8000',
      filledAt: '2025-06-09T08:00:00.000Z',
      createdByUserId: actor.id,
    });

    await fuelRecordService.createFuelRecord({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      odometerReading: 10400,
      litersPurchased: '60.000',
      pricePerLiter: '1.8000',
      filledAt: '2025-06-10T08:00:00.000Z',
      createdByUserId: actor.id,
    });

    const summary = await fuelRecordService.vehicleFuelSummary(organization.id, vehicle.id);

    expect(summary.recordCount).toBe(2);
    expect(summary.totalLiters).toBe('110');
    expect(summary.totalCost).toBe('198');
    expect(summary.kilometersDriven).toBe(400);
    expect(summary.litersPerKilometer).toBe('0.2750');
    expect(summary.averageCostPerKilometer).toBe('0.4950');
    expect(summary.averageFuelPerTrip).toBe('50');
    expect(summary.tripFuelRecordCount).toBe(1);
  });

  it('creates preferred fuel stations for an organization', async () => {
    const { organization } = await seedContext();

    const stations = await fuelStationService.findByOrganization(organization.id);

    expect(stations).toHaveLength(1);
    expect(stations[0].name).toBe('Test Station');
  });
});

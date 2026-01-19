import { Test, TestingModule } from '@nestjs/testing';
import { DriverStatus, VehicleStatus } from '@prisma/client';

import { DriverService } from '../../src/drivers/drivers.service';
import { FuelRecordService } from '../../src/fuel/fuel-records.service';
import { MaintenanceService } from '../../src/maintenance/maintenance.service';
import { OrganizationService } from '../../src/organizations/organizations.service';
import { PrismaService } from '../../src/database/prisma.service';
import { AnalyticsService } from '../../src/reports/analytics.service';
import { ReportService } from '../../src/reports/report.service';
import { TripService } from '../../src/trips/trips.service';
import { UserService } from '../../src/users/users.service';
import { VehicleAssignmentService } from '../../src/vehicle-assignments/vehicle-assignments.service';
import { VehicleService } from '../../src/vehicles/vehicles.service';
import { ReportsTestModule } from './reports-test.module';
import { resetDatabase } from './helpers/database.helper';

describe('Reports domain (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let userService: UserService;
  let vehicleService: VehicleService;
  let driverService: DriverService;
  let vehicleAssignmentService: VehicleAssignmentService;
  let tripService: TripService;
  let maintenanceService: MaintenanceService;
  let fuelRecordService: FuelRecordService;
  let analyticsService: AnalyticsService;
  let reportService: ReportService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [ReportsTestModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    userService = moduleRef.get(UserService);
    vehicleService = moduleRef.get(VehicleService);
    driverService = moduleRef.get(DriverService);
    vehicleAssignmentService = moduleRef.get(VehicleAssignmentService);
    tripService = moduleRef.get(TripService);
    maintenanceService = moduleRef.get(MaintenanceService);
    fuelRecordService = moduleRef.get(FuelRecordService);
    analyticsService = moduleRef.get(AnalyticsService);
    reportService = moduleRef.get(ReportService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleRef.close();
  });

  async function seedOperationalData() {
    const organization = await organizationService.createOrganization({
      name: 'Reports Org',
      slug: 'reports-org',
    });

    const actor = await userService.createUser({
      organizationId: organization.id,
      email: 'reports@reports-org.test',
      password: 'StrongPassword123!',
      firstName: 'Report',
      lastName: 'Analyst',
    });

    const activeVehicle = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: 'RPT-1001',
      vin: '1FTBR1C85PKR00001',
      make: 'Ford',
      model: 'Transit',
      year: 2022,
    });

    const maintenanceVehicle = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: 'RPT-1002',
      vin: '1FTBR1C85PKR00002',
      make: 'Ford',
      model: 'Transit',
      year: 2021,
    });

    await vehicleService.updateVehicleStatus({
      organizationId: organization.id,
      vehicleId: maintenanceVehicle.id,
      status: VehicleStatus.IN_MAINTENANCE,
      changedByUserId: actor.id,
    });

    const retiredVehicle = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: 'RPT-1003',
      vin: '1FTBR1C85PKR00003',
      make: 'Ford',
      model: 'Transit',
      year: 2020,
    });

    await vehicleService.updateVehicleStatus({
      organizationId: organization.id,
      vehicleId: retiredVehicle.id,
      status: VehicleStatus.RETIRED,
      changedByUserId: actor.id,
    });

    const activeDriver = await driverService.createDriver({
      organizationId: organization.id,
      employeeId: 'RPT-DRV-001',
      firstName: 'Active',
      lastName: 'Driver',
      licenseNumber: 'RPT-LIC-001',
      licenseExpiryDate: '2028-01-01',
    });

    await driverService.createDriver({
      organizationId: organization.id,
      employeeId: 'RPT-DRV-002',
      firstName: 'Inactive',
      lastName: 'Driver',
      licenseNumber: 'RPT-LIC-002',
      licenseExpiryDate: '2028-01-01',
    });

    const inactiveDriver = await driverService.findByOrganization(organization.id);
    const inactive = inactiveDriver.find((driver) => driver.employeeId === 'RPT-DRV-002');

    if (inactive) {
      await driverService.updateDriverStatus({
        organizationId: organization.id,
        driverId: inactive.id,
        status: DriverStatus.INACTIVE,
        changedByUserId: actor.id,
      });
    }

    await vehicleAssignmentService.assignVehicleToDriver({
      organizationId: organization.id,
      vehicleId: activeVehicle.id,
      driverId: activeDriver.id,
      assignedByUserId: actor.id,
    });

    const completedTrip = await tripService.createTrip({
      organizationId: organization.id,
      vehicleId: activeVehicle.id,
      driverId: activeDriver.id,
      tripNumber: 'RPT-TRIP-001',
      origin: 'Origin A',
      destination: 'Destination A',
      scheduledStartAt: '2025-06-10T08:00:00.000Z',
      scheduledEndAt: '2025-06-10T12:00:00.000Z',
      createdByUserId: actor.id,
    });

    await tripService.dispatchTrip({
      organizationId: organization.id,
      tripId: completedTrip.id,
      actorUserId: actor.id,
    });

    await tripService.startTrip({
      organizationId: organization.id,
      tripId: completedTrip.id,
      actorUserId: actor.id,
    });

    await tripService.completeTrip({
      organizationId: organization.id,
      tripId: completedTrip.id,
      actorUserId: actor.id,
    });

    const cancelledTrip = await tripService.createTrip({
      organizationId: organization.id,
      vehicleId: activeVehicle.id,
      driverId: activeDriver.id,
      tripNumber: 'RPT-TRIP-002',
      origin: 'Origin B',
      destination: 'Destination B',
      scheduledStartAt: '2025-06-11T08:00:00.000Z',
      scheduledEndAt: '2025-06-11T12:00:00.000Z',
      createdByUserId: actor.id,
    });

    await tripService.cancelTrip({
      organizationId: organization.id,
      tripId: cancelledTrip.id,
      actorUserId: actor.id,
    });

    const maintenance = await maintenanceService.scheduleMaintenance({
      organizationId: organization.id,
      vehicleId: maintenanceVehicle.id,
      title: 'Brake service',
      maintenanceType: 'PREVENTIVE',
      scheduledAt: '2025-06-12T09:00:00.000Z',
      estimatedCost: '150.00',
      createdByUserId: actor.id,
    });

    await maintenanceService.startMaintenance({
      organizationId: organization.id,
      maintenanceId: maintenance.id,
      actorUserId: actor.id,
    });

    await maintenanceService.completeMaintenance({
      organizationId: organization.id,
      maintenanceId: maintenance.id,
      actorUserId: actor.id,
      actualCost: '175.00',
    });

    await fuelRecordService.createFuelRecord({
      organizationId: organization.id,
      vehicleId: activeVehicle.id,
      odometerReading: 10000,
      litersPurchased: '50.000',
      pricePerLiter: '1.8000',
      filledAt: '2025-06-09T08:00:00.000Z',
      createdByUserId: actor.id,
    });

    await fuelRecordService.createFuelRecord({
      organizationId: organization.id,
      vehicleId: retiredVehicle.id,
      odometerReading: 50000,
      litersPurchased: '20.000',
      pricePerLiter: '2.0000',
      filledAt: '2025-06-13T08:00:00.000Z',
      createdByUserId: actor.id,
    });

    return { organization, actor };
  }

  it('generates fleet analytics', async () => {
    const { organization } = await seedOperationalData();

    const report = await reportService.generateFleetReport(organization.id, 'user-id', {
      startDate: '2025-06-01T00:00:00.000Z',
      endDate: '2025-06-30T23:59:59.999Z',
    });

    expect(report.reportType).toBe('fleet');
    expect(report.data.totalVehicles).toBe(3);
    expect(report.data.activeVehicles).toBe(1);
    expect(report.data.vehiclesInMaintenance).toBe(1);
    expect(report.data.retiredVehicles).toBe(1);
    expect(report.data.totalDrivers).toBe(2);
    expect(report.data.activeDrivers).toBe(1);
    expect(report.data.completedTrips).toBe(1);
    expect(report.data.cancelledTrips).toBe(1);
  });

  it('generates fuel analytics', async () => {
    const { organization } = await seedOperationalData();

    const analytics = await analyticsService.fuelAnalytics(organization.id, {
      startDate: '2025-06-01T00:00:00.000Z',
      endDate: '2025-06-30T23:59:59.999Z',
    });

    expect(analytics.totalFuelCost).toBe('130');
    expect(analytics.totalFuelPurchased).toBe('70');
    expect(analytics.highestFuelCostVehicle?.totalCost).toBe('90');
    expect(analytics.lowestFuelCostVehicle?.totalCost).toBe('40');
  });

  it('generates maintenance analytics', async () => {
    const { organization } = await seedOperationalData();

    const analytics = await analyticsService.maintenanceAnalytics(organization.id, {
      startDate: '2025-06-01T00:00:00.000Z',
      endDate: '2025-06-30T23:59:59.999Z',
    });

    expect(analytics.maintenanceCount).toBe(1);
    expect(analytics.preventiveMaintenanceCount).toBe(1);
    expect(analytics.totalMaintenanceCost).toBe('175');
    expect(analytics.averageMaintenanceCost).toBe('175');
  });

  it('generates trip analytics', async () => {
    const { organization } = await seedOperationalData();

    const analytics = await analyticsService.tripAnalytics(organization.id, {
      startDate: '2025-06-01T00:00:00.000Z',
      endDate: '2025-06-30T23:59:59.999Z',
    });

    expect(analytics.tripCount).toBe(2);
    expect(analytics.completedTripCount).toBe(1);
    expect(analytics.cancelledTripCount).toBe(1);
    expect(analytics.tripCompletionRate).toBe('50.00');
    expect(analytics.averageTripDurationMinutes).not.toBeNull();
  });

  it('generates organization dashboard report', async () => {
    const { organization, actor } = await seedOperationalData();

    const dashboard = await reportService.generateDashboardReport(organization.id, actor.id, {
      startDate: '2025-06-01T00:00:00.000Z',
      endDate: '2025-06-30T23:59:59.999Z',
    });

    expect(dashboard.reportType).toBe('dashboard');
    expect(dashboard.format).toBe('json');
    expect(dashboard.data.fleet.totalVehicles).toBe(3);
    expect(dashboard.data.fuel.totalFuelCost).toBe('130');
    expect(dashboard.data.maintenance.maintenanceCount).toBe(1);
    expect(dashboard.data.trips.tripCount).toBe(2);
  });

  it('excludes records outside the requested date range', async () => {
    const { organization } = await seedOperationalData();

    const analytics = await analyticsService.fuelAnalytics(organization.id, {
      startDate: '2025-06-13T00:00:00.000Z',
      endDate: '2025-06-30T23:59:59.999Z',
    });

    expect(analytics.totalFuelCost).toBe('40');
    expect(analytics.totalFuelPurchased).toBe('20');
  });
});

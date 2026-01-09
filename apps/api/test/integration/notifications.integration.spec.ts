import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';

import { DriverService } from '../../src/drivers/drivers.service';
import { FuelRecordService } from '../../src/fuel/fuel-records.service';
import { InspectionService } from '../../src/inspections/inspections.service';
import { MaintenanceService } from '../../src/maintenance/maintenance.service';
import { NotificationPreferenceService } from '../../src/notifications/notification-preferences.service';
import { NotificationService } from '../../src/notifications/notifications.service';
import { OrganizationService } from '../../src/organizations/organizations.service';
import { PrismaService } from '../../src/database/prisma.service';
import { TripService } from '../../src/trips/trips.service';
import { UserService } from '../../src/users/users.service';
import { VehicleAssignmentService } from '../../src/vehicle-assignments/vehicle-assignments.service';
import { VehicleService } from '../../src/vehicles/vehicles.service';
import { NotificationsTestModule } from './notifications-test.module';
import { resetDatabase } from './helpers/database.helper';

describe('Notifications domain (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let userService: UserService;
  let vehicleService: VehicleService;
  let driverService: DriverService;
  let vehicleAssignmentService: VehicleAssignmentService;
  let tripService: TripService;
  let maintenanceService: MaintenanceService;
  let inspectionService: InspectionService;
  let fuelRecordService: FuelRecordService;
  let notificationService: NotificationService;
  let notificationPreferenceService: NotificationPreferenceService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [NotificationsTestModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    userService = moduleRef.get(UserService);
    vehicleService = moduleRef.get(VehicleService);
    driverService = moduleRef.get(DriverService);
    vehicleAssignmentService = moduleRef.get(VehicleAssignmentService);
    tripService = moduleRef.get(TripService);
    maintenanceService = moduleRef.get(MaintenanceService);
    inspectionService = moduleRef.get(InspectionService);
    fuelRecordService = moduleRef.get(FuelRecordService);
    notificationService = moduleRef.get(NotificationService);
    notificationPreferenceService = moduleRef.get(NotificationPreferenceService);
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
      name: 'Notifications Org',
      slug: 'notifications-org',
    });

    const actor = await userService.createUser({
      organizationId: organization.id,
      email: 'dispatcher@notifications-org.test',
      password: 'StrongPassword123!',
      firstName: 'Alert',
      lastName: 'Manager',
    });

    const vehicle = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: 'NTF-1001',
      vin: '1FTBR1C85PKN00001',
      make: 'Ford',
      model: 'Transit',
      year: 2022,
    });

    const driver = await driverService.createDriver({
      organizationId: organization.id,
      employeeId: 'NTF-DRV-001',
      firstName: 'Road',
      lastName: 'Driver',
      licenseNumber: 'NTF-LIC-001',
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

  it('generates a notification when a trip starts', async () => {
    const { organization, actor, vehicle, driver } = await seedContext();

    const trip = await tripService.createTrip({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      tripNumber: 'NTF-TRIP-001',
      origin: 'Origin',
      destination: 'Destination',
      scheduledStartAt: '2025-06-10T08:00:00.000Z',
      scheduledEndAt: '2025-06-10T12:00:00.000Z',
      createdByUserId: actor.id,
    });

    await tripService.dispatchTrip({
      organizationId: organization.id,
      tripId: trip.id,
      actorUserId: actor.id,
    });

    await tripService.startTrip({
      organizationId: organization.id,
      tripId: trip.id,
      actorUserId: actor.id,
    });

    const unread = await notificationService.getUnreadNotifications(organization.id, actor.id);

    expect(unread).toHaveLength(1);
    expect(unread[0].type).toBe(NotificationType.TRIP_STARTED);
    expect(unread[0].metadata?.tripNumber).toBe('NTF-TRIP-001');
  });

  it('generates a notification when maintenance starts', async () => {
    const { organization, actor, vehicle } = await seedContext();

    const maintenance = await maintenanceService.scheduleMaintenance({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      title: 'Brake service',
      maintenanceType: 'PREVENTIVE',
      scheduledAt: '2025-06-15T09:00:00.000Z',
      createdByUserId: actor.id,
    });

    await maintenanceService.startMaintenance({
      organizationId: organization.id,
      maintenanceId: maintenance.id,
      actorUserId: actor.id,
    });

    const unread = await notificationService.getUnreadNotifications(organization.id, actor.id);

    expect(unread).toHaveLength(1);
    expect(unread[0].type).toBe(NotificationType.MAINTENANCE_STARTED);
  });

  it('generates a notification when an inspection fails', async () => {
    const { organization, actor, vehicle } = await seedContext();

    await inspectionService.createInspection({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      inspectionDate: '2025-06-01',
      passed: false,
      notes: 'Brake lights failed',
      inspectorName: 'Safety Inspector',
      createdByUserId: actor.id,
    });

    const unread = await notificationService.getUnreadNotifications(organization.id, actor.id);

    expect(unread).toHaveLength(1);
    expect(unread[0].type).toBe(NotificationType.INSPECTION_FAILED);
  });

  it('supports read and unread workflow', async () => {
    const { organization, actor, vehicle, driver } = await seedContext();

    const trip = await tripService.createTrip({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      tripNumber: 'NTF-TRIP-002',
      origin: 'Origin',
      destination: 'Destination',
      scheduledStartAt: '2025-06-11T08:00:00.000Z',
      scheduledEndAt: '2025-06-11T12:00:00.000Z',
      createdByUserId: actor.id,
    });

    await tripService.dispatchTrip({
      organizationId: organization.id,
      tripId: trip.id,
      actorUserId: actor.id,
    });

    await tripService.startTrip({
      organizationId: organization.id,
      tripId: trip.id,
      actorUserId: actor.id,
    });

    await tripService.completeTrip({
      organizationId: organization.id,
      tripId: trip.id,
      actorUserId: actor.id,
    });

    const notifications = await notificationService.getNotifications(organization.id, actor.id);

    expect(notifications).toHaveLength(2);

    const unreadBefore = await notificationService.getUnreadNotifications(
      organization.id,
      actor.id,
    );
    expect(unreadBefore).toHaveLength(2);

    await notificationService.markAsRead(organization.id, actor.id, notifications[0].id);

    const unreadAfterSingle = await notificationService.getUnreadNotifications(
      organization.id,
      actor.id,
    );
    expect(unreadAfterSingle).toHaveLength(1);

    const readCount = await notificationService.markAllAsRead(organization.id, actor.id);
    expect(readCount).toBe(1);

    const unreadAfterAll = await notificationService.getUnreadNotifications(
      organization.id,
      actor.id,
    );
    expect(unreadAfterAll).toHaveLength(0);
  });

  it('respects notification preferences when generating alerts', async () => {
    const { organization, actor, vehicle } = await seedContext();

    await notificationPreferenceService.updatePreferences(organization.id, actor.id, {
      maintenanceNotifications: false,
    });

    const maintenance = await maintenanceService.scheduleMaintenance({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      title: 'Oil change',
      maintenanceType: 'PREVENTIVE',
      scheduledAt: '2025-06-16T09:00:00.000Z',
      createdByUserId: actor.id,
    });

    await maintenanceService.startMaintenance({
      organizationId: organization.id,
      maintenanceId: maintenance.id,
      actorUserId: actor.id,
    });

    const unread = await notificationService.getUnreadNotifications(organization.id, actor.id);

    expect(unread).toHaveLength(0);
  });

  it('generates a notification when a fuel record is created', async () => {
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

    const unread = await notificationService.getUnreadNotifications(organization.id, actor.id);

    expect(unread).toHaveLength(1);
    expect(unread[0].type).toBe(NotificationType.FUEL_RECORD_CREATED);
  });
});

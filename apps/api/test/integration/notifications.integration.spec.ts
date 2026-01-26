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

  async function createPlannedTrip(
    organizationId: string,
    vehicleId: string,
    driverId: string,
    actorUserId: string,
    tripNumber: string,
  ) {
    return tripService.createTrip({
      organizationId,
      vehicleId,
      driverId,
      tripNumber,
      origin: 'Origin',
      destination: 'Destination',
      scheduledStartAt: '2025-06-10T08:00:00.000Z',
      scheduledEndAt: '2025-06-10T12:00:00.000Z',
      createdByUserId: actorUserId,
    });
  }

  async function expectPersistedNotification(
    organizationId: string,
    userId: string,
    type: NotificationType,
    expected: {
      title: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const stored = await prisma.notification.findMany({
      where: { organizationId, userId, type },
    });

    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe(expected.title);
    expect(stored[0].readAt).toBeNull();

    if (expected.metadata) {
      expect(stored[0].metadata).toMatchObject(expected.metadata);
    }

    const unread = await notificationService.getUnreadNotifications(organizationId, userId);
    expect(unread.some((notification) => notification.type === type)).toBe(true);

    return stored[0];
  }

  describe('notification type generation', () => {
    it('creates TRIP_STARTED notifications', async () => {
      const { organization, actor, vehicle, driver } = await seedContext();
      const trip = await createPlannedTrip(
        organization.id,
        vehicle.id,
        driver.id,
        actor.id,
        'NTF-TRIP-START',
      );

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

      await expectPersistedNotification(organization.id, actor.id, NotificationType.TRIP_STARTED, {
        title: 'Trip started',
        metadata: { tripNumber: 'NTF-TRIP-START', tripId: trip.id },
      });
    });

    it('creates TRIP_COMPLETED notifications', async () => {
      const { organization, actor, vehicle, driver } = await seedContext();
      const trip = await createPlannedTrip(
        organization.id,
        vehicle.id,
        driver.id,
        actor.id,
        'NTF-TRIP-COMPLETE',
      );

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

      await expectPersistedNotification(
        organization.id,
        actor.id,
        NotificationType.TRIP_COMPLETED,
        {
          title: 'Trip completed',
          metadata: { tripNumber: 'NTF-TRIP-COMPLETE', tripId: trip.id },
        },
      );
    });

    it('creates MAINTENANCE_STARTED notifications', async () => {
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

      await expectPersistedNotification(
        organization.id,
        actor.id,
        NotificationType.MAINTENANCE_STARTED,
        {
          title: 'Maintenance started',
          metadata: { maintenanceId: maintenance.id, vehicleId: vehicle.id },
        },
      );
    });

    it('creates MAINTENANCE_COMPLETED notifications', async () => {
      const { organization, actor, vehicle } = await seedContext();

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

      await maintenanceService.completeMaintenance({
        organizationId: organization.id,
        maintenanceId: maintenance.id,
        actorUserId: actor.id,
        actualCost: '125.00',
      });

      await expectPersistedNotification(
        organization.id,
        actor.id,
        NotificationType.MAINTENANCE_COMPLETED,
        {
          title: 'Maintenance completed',
          metadata: { maintenanceId: maintenance.id, vehicleId: vehicle.id },
        },
      );
    });

    it('creates INSPECTION_FAILED notifications', async () => {
      const { organization, actor, vehicle } = await seedContext();

      const inspection = await inspectionService.createInspection({
        organizationId: organization.id,
        vehicleId: vehicle.id,
        inspectionDate: '2025-06-01',
        passed: false,
        notes: 'Brake lights failed',
        inspectorName: 'Safety Inspector',
        createdByUserId: actor.id,
      });

      await expectPersistedNotification(
        organization.id,
        actor.id,
        NotificationType.INSPECTION_FAILED,
        {
          title: 'Inspection failed',
          metadata: {
            inspectionId: inspection.id,
            vehicleId: vehicle.id,
            passed: false,
          },
        },
      );
    });

    it('creates FUEL_RECORD_CREATED notifications', async () => {
      const { organization, actor, vehicle } = await seedContext();

      const fuelRecord = await fuelRecordService.createFuelRecord({
        organizationId: organization.id,
        vehicleId: vehicle.id,
        odometerReading: 10000,
        litersPurchased: '50.000',
        pricePerLiter: '1.8000',
        filledAt: '2025-06-09T08:00:00.000Z',
        createdByUserId: actor.id,
      });

      await expectPersistedNotification(
        organization.id,
        actor.id,
        NotificationType.FUEL_RECORD_CREATED,
        {
          title: 'Fuel record created',
          metadata: {
            fuelRecordId: fuelRecord.id,
            vehicleId: vehicle.id,
            totalCost: fuelRecord.totalCost,
          },
        },
      );
    });

    it('does not create notifications for passed inspections', async () => {
      const { organization, actor, vehicle } = await seedContext();

      await inspectionService.createInspection({
        organizationId: organization.id,
        vehicleId: vehicle.id,
        inspectionDate: '2025-06-02',
        passed: true,
        inspectorName: 'Safety Inspector',
        createdByUserId: actor.id,
      });

      const stored = await prisma.notification.findMany({
        where: { organizationId: organization.id, userId: actor.id },
      });

      expect(stored).toHaveLength(0);
    });
  });

  describe('notification preferences', () => {
    it('suppresses trip notifications when tripNotifications is disabled', async () => {
      const { organization, actor, vehicle, driver } = await seedContext();

      await notificationPreferenceService.updatePreferences(organization.id, actor.id, {
        tripNotifications: false,
      });

      const trip = await createPlannedTrip(
        organization.id,
        vehicle.id,
        driver.id,
        actor.id,
        'NTF-TRIP-SUPPRESSED',
      );

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

      const stored = await prisma.notification.findMany({
        where: { organizationId: organization.id, userId: actor.id },
      });

      expect(stored).toHaveLength(0);
    });

    it('suppresses maintenance notifications when maintenanceNotifications is disabled', async () => {
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

      await maintenanceService.completeMaintenance({
        organizationId: organization.id,
        maintenanceId: maintenance.id,
        actorUserId: actor.id,
      });

      const stored = await prisma.notification.findMany({
        where: { organizationId: organization.id, userId: actor.id },
      });

      expect(stored).toHaveLength(0);
    });

    it('suppresses inspection notifications when inspectionNotifications is disabled', async () => {
      const { organization, actor, vehicle } = await seedContext();

      await notificationPreferenceService.updatePreferences(organization.id, actor.id, {
        inspectionNotifications: false,
      });

      await inspectionService.createInspection({
        organizationId: organization.id,
        vehicleId: vehicle.id,
        inspectionDate: '2025-06-01',
        passed: false,
        notes: 'Tires worn',
        inspectorName: 'Safety Inspector',
        createdByUserId: actor.id,
      });

      const stored = await prisma.notification.findMany({
        where: { organizationId: organization.id, userId: actor.id },
      });

      expect(stored).toHaveLength(0);
    });

    it('suppresses fuel notifications when fuelNotifications is disabled', async () => {
      const { organization, actor, vehicle } = await seedContext();

      await notificationPreferenceService.updatePreferences(organization.id, actor.id, {
        fuelNotifications: false,
      });

      await fuelRecordService.createFuelRecord({
        organizationId: organization.id,
        vehicleId: vehicle.id,
        odometerReading: 10000,
        litersPurchased: '50.000',
        pricePerLiter: '1.8000',
        filledAt: '2025-06-09T08:00:00.000Z',
        createdByUserId: actor.id,
      });

      const stored = await prisma.notification.findMany({
        where: { organizationId: organization.id, userId: actor.id },
      });

      expect(stored).toHaveLength(0);
    });
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
});

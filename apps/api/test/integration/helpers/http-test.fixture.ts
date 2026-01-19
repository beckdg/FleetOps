import { MaintenanceType, NotificationType } from '@prisma/client';

import { DriverService } from '../../../src/drivers/drivers.service';
import { FuelRecordService } from '../../../src/fuel/fuel-records.service';
import { FuelStationService } from '../../../src/fuel/fuel-stations.service';
import { MaintenanceService } from '../../../src/maintenance/maintenance.service';
import { NotificationService } from '../../../src/notifications/notifications.service';
import { TripService } from '../../../src/trips/trips.service';
import { VehicleAssignmentService } from '../../../src/vehicle-assignments/vehicle-assignments.service';
import { VehicleService } from '../../../src/vehicles/vehicles.service';
import { HttpTestEnv, createOrganization } from './http-test.helper';

export interface HttpFleetFixture {
  organization: Awaited<ReturnType<typeof createOrganization>>;
  actor: { id: string; email: string };
  vehicle: { id: string };
  secondaryVehicle: { id: string };
  assignableVehicle: { id: string };
  assignableDriver: { id: string };
  driver: { id: string };
  secondaryDriver: { id: string };
  activeAssignment: { id: string; vehicleId: string; driverId: string };
  plannedTrip: { id: string };
  adminPlannedTrip: { id: string };
  dispatchedTrip: { id: string };
  inProgressTrip: { id: string };
  scheduledMaintenance: { id: string };
  adminScheduledMaintenance: { id: string };
  inProgressMaintenance: { id: string };
  fuelStation: { id: string };
  fuelVehicle: { id: string };
  notification: { id: string };
  counter: number;
}

export interface DualOrgFixture {
  orgA: HttpFleetFixture;
  orgB: HttpFleetFixture;
}

let fixtureCounter = 0;

function nextSuffix(): string {
  fixtureCounter += 1;
  return `${Date.now()}-${fixtureCounter}`;
}

export async function seedHttpFleetFixture(
  env: HttpTestEnv,
  slugPrefix = 'http-fleet',
): Promise<HttpFleetFixture> {
  const suffix = nextSuffix();
  const organization = await createOrganization(env, `${slugPrefix}-${suffix}`);

  const actor = await env.userService.createUser({
    organizationId: organization.id,
    email: `actor-${suffix}@http.test`,
    password: 'StrongPassword123!',
    firstName: 'Fleet',
    lastName: 'Actor',
  });

  const vehicleService = env.moduleRef.get(VehicleService);
  const driverService = env.moduleRef.get(DriverService);
  const vehicleAssignmentService = env.moduleRef.get(VehicleAssignmentService);
  const tripService = env.moduleRef.get(TripService);
  const maintenanceService = env.moduleRef.get(MaintenanceService);
  const fuelRecordService = env.moduleRef.get(FuelRecordService);
  const fuelStationService = env.moduleRef.get(FuelStationService);
  const notificationService = env.moduleRef.get(NotificationService);

  const vehicle = await vehicleService.createVehicle({
    organizationId: organization.id,
    plateNumber: `HTTP-${suffix}-V1`,
    vin: `1HTTPV1${suffix.padStart(11, '0').slice(-11)}`,
    make: 'Ford',
    model: 'Transit',
    year: 2022,
  });

  const secondaryVehicle = await vehicleService.createVehicle({
    organizationId: organization.id,
    plateNumber: `HTTP-${suffix}-V2`,
    vin: `1HTTPV2${suffix.padStart(11, '0').slice(-11)}`,
    make: 'Ford',
    model: 'Transit',
    year: 2023,
  });

  const assignableVehicle = await vehicleService.createVehicle({
    organizationId: organization.id,
    plateNumber: `HTTP-${suffix}-VA`,
    vin: `1HTTPVA${suffix.padStart(11, '0').slice(-11)}`,
    make: 'Ford',
    model: 'Transit',
    year: 2024,
  });

  const driver = await driverService.createDriver({
    organizationId: organization.id,
    employeeId: `EMP-${suffix}-D1`,
    firstName: 'Primary',
    lastName: 'Driver',
    licenseNumber: `LIC-${suffix}-D1`,
    licenseExpiryDate: '2028-01-01',
  });

  const secondaryDriver = await driverService.createDriver({
    organizationId: organization.id,
    employeeId: `EMP-${suffix}-D2`,
    firstName: 'Secondary',
    lastName: 'Driver',
    licenseNumber: `LIC-${suffix}-D2`,
    licenseExpiryDate: '2028-01-01',
  });

  const assignableDriver = await driverService.createDriver({
    organizationId: organization.id,
    employeeId: `EMP-${suffix}-DA`,
    firstName: 'Assignable',
    lastName: 'Driver',
    licenseNumber: `LIC-${suffix}-DA`,
    licenseExpiryDate: '2028-01-01',
  });

  const activeAssignment = await vehicleAssignmentService.assignVehicleToDriver({
    organizationId: organization.id,
    vehicleId: vehicle.id,
    driverId: driver.id,
    assignedByUserId: actor.id,
  });

  const plannedTrip = await tripService.createTrip({
    organizationId: organization.id,
    vehicleId: vehicle.id,
    driverId: driver.id,
    tripNumber: `TRIP-${suffix}-PLANNED`,
    origin: 'Chicago, IL',
    destination: 'Milwaukee, WI',
    scheduledStartAt: '2026-06-10T08:00:00.000Z',
    scheduledEndAt: '2026-06-10T12:00:00.000Z',
    createdByUserId: actor.id,
  });

  const adminPlannedTrip = await tripService.createTrip({
    organizationId: organization.id,
    vehicleId: secondaryVehicle.id,
    driverId: secondaryDriver.id,
    tripNumber: `TRIP-${suffix}-ADMIN`,
    origin: 'Madison, WI',
    destination: 'Green Bay, WI',
    scheduledStartAt: '2026-06-11T08:00:00.000Z',
    scheduledEndAt: '2026-06-11T12:00:00.000Z',
    createdByUserId: actor.id,
  });

  const dispatchedTrip = await tripService.createTrip({
    organizationId: organization.id,
    vehicleId: secondaryVehicle.id,
    driverId: secondaryDriver.id,
    tripNumber: `TRIP-${suffix}-DISPATCH`,
    origin: 'Detroit, MI',
    destination: 'Cleveland, OH',
    scheduledStartAt: '2026-06-12T08:00:00.000Z',
    scheduledEndAt: '2026-06-12T16:00:00.000Z',
    createdByUserId: actor.id,
  });
  await tripService.dispatchTrip({
    organizationId: organization.id,
    tripId: dispatchedTrip.id,
    actorUserId: actor.id,
  });

  const inProgressTrip = await tripService.createTrip({
    organizationId: organization.id,
    vehicleId: vehicle.id,
    driverId: driver.id,
    tripNumber: `TRIP-${suffix}-PROGRESS`,
    origin: 'Indianapolis, IN',
    destination: 'Columbus, OH',
    scheduledStartAt: '2026-06-13T08:00:00.000Z',
    scheduledEndAt: '2026-06-13T18:00:00.000Z',
    createdByUserId: actor.id,
  });
  await tripService.dispatchTrip({
    organizationId: organization.id,
    tripId: inProgressTrip.id,
    actorUserId: actor.id,
  });
  await tripService.startTrip({
    organizationId: organization.id,
    tripId: inProgressTrip.id,
    actorUserId: actor.id,
  });

  const scheduledMaintenance = await maintenanceService.scheduleMaintenance({
    organizationId: organization.id,
    vehicleId: vehicle.id,
    title: 'Oil change',
    maintenanceType: MaintenanceType.PREVENTIVE,
    scheduledAt: '2026-06-15T09:00:00.000Z',
    createdByUserId: actor.id,
  });

  const adminScheduledMaintenance = await maintenanceService.scheduleMaintenance({
    organizationId: organization.id,
    vehicleId: secondaryVehicle.id,
    title: 'Brake inspection',
    maintenanceType: MaintenanceType.PREVENTIVE,
    scheduledAt: '2026-06-16T09:00:00.000Z',
    createdByUserId: actor.id,
  });

  const inProgressMaintenance = await maintenanceService.scheduleMaintenance({
    organizationId: organization.id,
    vehicleId: secondaryVehicle.id,
    title: 'Tire rotation',
    maintenanceType: MaintenanceType.PREVENTIVE,
    scheduledAt: '2026-06-17T09:00:00.000Z',
    createdByUserId: actor.id,
  });
  await maintenanceService.startMaintenance({
    organizationId: organization.id,
    maintenanceId: inProgressMaintenance.id,
    actorUserId: actor.id,
  });

  const fuelStation = await fuelStationService.createFuelStation({
    organizationId: organization.id,
    name: `Depot ${suffix}`,
    location: '100 Fleet Way',
  });

  const fuelVehicle = await vehicleService.createVehicle({
    organizationId: organization.id,
    plateNumber: `HTTP-${suffix}-FUEL`,
    vin: `1HTTPFUEL${suffix.padStart(10, '0').slice(-10)}`,
    make: 'Ford',
    model: 'Transit',
    year: 2021,
  });

  await fuelRecordService.createFuelRecord({
    organizationId: organization.id,
    vehicleId: fuelVehicle.id,
    fuelStationId: fuelStation.id,
    odometerReading: 10000,
    litersPurchased: '50',
    pricePerLiter: '1.75',
    filledAt: '2026-06-01T10:00:00.000Z',
    createdByUserId: actor.id,
  });

  const notification = await notificationService.createNotification({
    organizationId: organization.id,
    userId: actor.id,
    type: NotificationType.SYSTEM,
    title: 'Test notification',
    message: 'HTTP integration test notification',
  });

  if (!notification) {
    throw new Error('Failed to seed notification for HTTP tests');
  }

  return {
    organization,
    actor,
    vehicle,
    secondaryVehicle,
    assignableVehicle,
    assignableDriver,
    driver,
    secondaryDriver,
    activeAssignment: {
      id: activeAssignment.id,
      vehicleId: activeAssignment.vehicleId,
      driverId: activeAssignment.driverId,
    },
    plannedTrip,
    adminPlannedTrip,
    dispatchedTrip,
    inProgressTrip,
    scheduledMaintenance,
    adminScheduledMaintenance,
    inProgressMaintenance,
    fuelStation,
    fuelVehicle,
    notification,
    counter: 0,
  };
}

export async function seedDualOrganizationFixture(env: HttpTestEnv): Promise<DualOrgFixture> {
  const orgA = await seedHttpFleetFixture(env, 'http-org-a');
  const orgB = await seedHttpFleetFixture(env, 'http-org-b');
  return { orgA, orgB };
}

export async function createFreshAssignablePair(
  env: HttpTestEnv,
  fixture: HttpFleetFixture,
): Promise<{ vehicleId: string; driverId: string }> {
  fixture.counter += 1;
  const suffix = `${nextSuffix()}-${fixture.counter}`;

  const vehicleService = env.moduleRef.get(VehicleService);
  const driverService = env.moduleRef.get(DriverService);

  const vehicle = await vehicleService.createVehicle({
    organizationId: fixture.organization.id,
    plateNumber: `HTTP-${suffix}-NEWV`,
    vin: `1HTTPNEWV${suffix.padStart(10, '0').slice(-10)}`,
    make: 'Ford',
    model: 'Transit',
    year: 2022,
  });

  const driver = await driverService.createDriver({
    organizationId: fixture.organization.id,
    employeeId: `EMP-${suffix}`,
    firstName: 'Fresh',
    lastName: 'Driver',
    licenseNumber: `LIC-${suffix}`,
    licenseExpiryDate: '2028-01-01',
  });

  return { vehicleId: vehicle.id, driverId: driver.id };
}

export async function createFreshPlannedTrip(
  env: HttpTestEnv,
  fixture: HttpFleetFixture,
): Promise<{ id: string }> {
  fixture.counter += 1;
  const tripService = env.moduleRef.get(TripService);

  return tripService.createTrip({
    organizationId: fixture.organization.id,
    vehicleId: fixture.secondaryVehicle.id,
    driverId: fixture.secondaryDriver.id,
    tripNumber: `TRIP-FRESH-${fixture.counter}-${Date.now()}`,
    origin: 'Austin, TX',
    destination: 'Dallas, TX',
    scheduledStartAt: '2026-07-01T08:00:00.000Z',
    scheduledEndAt: '2026-07-01T12:00:00.000Z',
    createdByUserId: fixture.actor.id,
  });
}

export async function createFreshScheduledMaintenance(
  env: HttpTestEnv,
  fixture: HttpFleetFixture,
): Promise<{ id: string }> {
  fixture.counter += 1;
  const maintenanceService = env.moduleRef.get(MaintenanceService);

  return maintenanceService.scheduleMaintenance({
    organizationId: fixture.organization.id,
    vehicleId: fixture.secondaryVehicle.id,
    title: `Fresh maintenance ${fixture.counter}`,
    maintenanceType: MaintenanceType.PREVENTIVE,
    scheduledAt: '2026-07-02T09:00:00.000Z',
    createdByUserId: fixture.actor.id,
  });
}

export async function createFreshActiveAssignment(
  env: HttpTestEnv,
  fixture: HttpFleetFixture,
): Promise<{ id: string }> {
  const pair = await createFreshAssignablePair(env, fixture);
  const vehicleAssignmentService = env.moduleRef.get(VehicleAssignmentService);

  const assignment = await vehicleAssignmentService.assignVehicleToDriver({
    organizationId: fixture.organization.id,
    vehicleId: pair.vehicleId,
    driverId: pair.driverId,
    assignedByUserId: fixture.actor.id,
  });

  return { id: assignment.id };
}

export async function createNotificationForUser(
  env: HttpTestEnv,
  organizationId: string,
  userId: string,
): Promise<{ id: string }> {
  const notification = await env.prisma.notification.create({
    data: {
      organizationId,
      userId,
      type: NotificationType.SYSTEM,
      title: 'User notification',
      message: 'Notification for HTTP RBAC test',
    },
  });

  return { id: notification.id };
}

export async function createFreshNotification(
  env: HttpTestEnv,
  fixture: HttpFleetFixture,
): Promise<{ id: string }> {
  fixture.counter += 1;
  const notificationService = env.moduleRef.get(NotificationService);

  const notification = await notificationService.createNotification({
    organizationId: fixture.organization.id,
    userId: fixture.actor.id,
    type: NotificationType.SYSTEM,
    title: `Fresh notification ${fixture.counter}`,
    message: 'Unread notification for HTTP tests',
  });

  if (!notification) {
    throw new Error('Failed to create fresh notification');
  }

  return { id: notification.id };
}

export function vehicleCreateBody(suffix: string) {
  return {
    plateNumber: `NEW-${suffix}`,
    vin: `1NEWVIN${suffix.padStart(11, '0').slice(-11)}`,
    make: 'Ford',
    model: 'Transit',
    year: 2022,
  };
}

export function driverCreateBody(suffix: string) {
  return {
    employeeId: `EMP-NEW-${suffix}`,
    firstName: 'New',
    lastName: 'Driver',
    licenseNumber: `LIC-NEW-${suffix}`,
    licenseExpiryDate: '2028-01-01',
  };
}

export function tripCreateBody(
  fixture: HttpFleetFixture,
  suffix: string,
  vehicleId = fixture.assignableVehicle.id,
  driverId = fixture.assignableDriver.id,
) {
  return {
    vehicleId,
    driverId,
    tripNumber: `TRIP-NEW-${suffix}`,
    origin: 'Seattle, WA',
    destination: 'Portland, OR',
    scheduledStartAt: '2026-08-01T08:00:00.000Z',
    scheduledEndAt: '2026-08-01T14:00:00.000Z',
  };
}

export function maintenanceCreateBody(fixture: HttpFleetFixture) {
  return {
    vehicleId: fixture.assignableVehicle.id,
    title: 'Scheduled service',
    maintenanceType: MaintenanceType.PREVENTIVE,
    scheduledAt: '2026-08-02T09:00:00.000Z',
  };
}

export function inspectionCreateBody(fixture: HttpFleetFixture) {
  return {
    vehicleId: fixture.assignableVehicle.id,
    inspectionDate: '2026-08-03',
    passed: true,
    inspectorName: 'Jordan Lee',
  };
}

export function fuelRecordCreateBody(fixture: HttpFleetFixture) {
  return {
    vehicleId: fixture.fuelVehicle.id,
    fuelStationId: fixture.fuelStation.id,
    odometerReading: 10500,
    litersPurchased: '45',
    pricePerLiter: '1.80',
    filledAt: '2026-08-04T10:00:00.000Z',
  };
}

export function fuelStationCreateBody(suffix: string) {
  return {
    name: `Station ${suffix}`,
    location: '200 Fuel Road',
  };
}

export async function ensureAssignableTripResources(
  env: HttpTestEnv,
  fixture: HttpFleetFixture,
): Promise<void> {
  const vehicleAssignmentService = env.moduleRef.get(VehicleAssignmentService);

  await vehicleAssignmentService.assignVehicleToDriver({
    organizationId: fixture.organization.id,
    vehicleId: fixture.assignableVehicle.id,
    driverId: fixture.assignableDriver.id,
    assignedByUserId: fixture.actor.id,
  });
}

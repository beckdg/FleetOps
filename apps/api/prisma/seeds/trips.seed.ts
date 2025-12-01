import { TripEventType, TripStatus } from '@prisma/client';

import { DEMO_DISPATCHER_EMAIL } from './demo-fleet-setup.seed';
import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';
import type { SeedContext } from './types';

const DEMO_TRIPS = [
  {
    tripNumber: 'TRIP-DEMO-001',
    origin: 'Chicago Distribution Center',
    destination: 'Milwaukee Depot',
    scheduledStartAt: new Date('2025-06-10T08:00:00.000Z'),
    scheduledEndAt: new Date('2025-06-10T12:00:00.000Z'),
    status: TripStatus.PLANNED,
    vehiclePlate: 'FLT-1001',
    driverEmployeeId: 'DRV-001',
    actualStartAt: null as Date | null,
  },
  {
    tripNumber: 'TRIP-DEMO-002',
    origin: 'Indianapolis Hub',
    destination: 'Detroit Terminal',
    scheduledStartAt: new Date('2025-06-11T09:00:00.000Z'),
    scheduledEndAt: new Date('2025-06-11T15:00:00.000Z'),
    status: TripStatus.DISPATCHED,
    vehiclePlate: 'FLT-1002',
    driverEmployeeId: 'DRV-002',
    actualStartAt: null as Date | null,
  },
  {
    tripNumber: 'TRIP-DEMO-003',
    origin: 'St. Louis Yard',
    destination: 'Kansas City Warehouse',
    scheduledStartAt: new Date('2025-06-20T07:00:00.000Z'),
    scheduledEndAt: new Date('2025-06-20T13:00:00.000Z'),
    status: TripStatus.IN_PROGRESS,
    vehiclePlate: 'FLT-1001',
    driverEmployeeId: 'DRV-001',
    actualStartAt: new Date('2025-06-20T07:15:00.000Z'),
  },
] as const;

async function ensureTripEvent(
  context: SeedContext,
  tripId: string,
  eventType: TripEventType,
  createdByUserId: string,
): Promise<void> {
  const existing = await context.prisma.tripEvent.findFirst({
    where: { tripId, eventType },
  });

  if (!existing) {
    await context.prisma.tripEvent.create({
      data: { tripId, eventType, createdByUserId },
    });
  }
}

export async function seedTrips(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    context.logger.warn('Demo organization not found — skipping trip seed');
    return;
  }

  const dispatcher = await context.prisma.user.findUnique({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: DEMO_DISPATCHER_EMAIL,
      },
    },
  });

  if (!dispatcher) {
    context.logger.warn('Demo dispatcher not found — skipping trip seed');
    return;
  }

  for (const demoTrip of DEMO_TRIPS) {
    const vehicle = await context.prisma.vehicle.findFirst({
      where: { organizationId: organization.id, plateNumber: demoTrip.vehiclePlate },
    });
    const driver = await context.prisma.driver.findFirst({
      where: { organizationId: organization.id, employeeId: demoTrip.driverEmployeeId },
    });

    if (!vehicle || !driver) {
      context.logger.warn(`Skipping trip ${demoTrip.tripNumber} — vehicle or driver missing`);
      continue;
    }

    const trip = await context.prisma.trip.upsert({
      where: {
        organizationId_tripNumber: {
          organizationId: organization.id,
          tripNumber: demoTrip.tripNumber,
        },
      },
      update: {
        origin: demoTrip.origin,
        destination: demoTrip.destination,
        scheduledStartAt: demoTrip.scheduledStartAt,
        scheduledEndAt: demoTrip.scheduledEndAt,
        status: demoTrip.status,
        actualStartAt: demoTrip.actualStartAt,
      },
      create: {
        organizationId: organization.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        tripNumber: demoTrip.tripNumber,
        origin: demoTrip.origin,
        destination: demoTrip.destination,
        scheduledStartAt: demoTrip.scheduledStartAt,
        scheduledEndAt: demoTrip.scheduledEndAt,
        status: demoTrip.status,
        actualStartAt: demoTrip.actualStartAt,
        createdByUserId: dispatcher.id,
      },
    });

    await ensureTripEvent(context, trip.id, TripEventType.TRIP_CREATED, dispatcher.id);

    if (demoTrip.status === TripStatus.DISPATCHED) {
      await ensureTripEvent(context, trip.id, TripEventType.TRIP_DISPATCHED, dispatcher.id);
    }

    if (demoTrip.status === TripStatus.IN_PROGRESS) {
      await ensureTripEvent(context, trip.id, TripEventType.TRIP_DISPATCHED, dispatcher.id);
      await ensureTripEvent(context, trip.id, TripEventType.TRIP_STARTED, dispatcher.id);
    }
  }

  context.logger.info(`Ensured ${DEMO_TRIPS.length} demo trips for "${DEMO_ORGANIZATION_SLUG}"`);
}

import { Prisma } from '@prisma/client';

import { DEMO_DISPATCHER_EMAIL } from './demo-fleet-setup.seed';
import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';
import type { SeedContext } from './types';

const DEMO_FUEL_STATIONS = [
  {
    id: 'a1000000-0000-4000-8000-000000000001',
    name: 'Fleet Depot Fuel Center',
    location: '1200 Industrial Blvd, Chicago, IL',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000002',
    name: 'Midwest Truck Stop',
    location: '450 Highway 41, Gary, IN',
  },
  {
    id: 'a1000000-0000-4000-8000-000000000003',
    name: 'Interstate Fuel Hub',
    location: '88 Logistics Way, Indianapolis, IN',
  },
] as const;

const DEMO_FUEL_RECORDS = [
  {
    vehiclePlate: 'FLT-1001',
    tripNumber: 'TRIP-DEMO-001',
    stationName: 'Fleet Depot Fuel Center',
    odometer: 12000,
    liters: '72.500',
    price: '1.8200',
    filledAt: '2025-06-09T08:00:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1001',
    tripNumber: 'TRIP-DEMO-003',
    stationName: 'Midwest Truck Stop',
    odometer: 12450,
    liters: '68.000',
    price: '1.7900',
    filledAt: '2025-06-19T17:30:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1001',
    tripNumber: null,
    stationName: 'Fleet Depot Fuel Center',
    odometer: 12800,
    liters: '55.250',
    price: '1.8500',
    filledAt: '2025-06-25T09:15:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1001',
    tripNumber: null,
    stationName: 'Interstate Fuel Hub',
    odometer: 13120,
    liters: '60.000',
    price: '1.8100',
    filledAt: '2025-07-02T11:00:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1001',
    tripNumber: null,
    stationName: 'Midwest Truck Stop',
    odometer: 13480,
    liters: '58.750',
    price: '1.7950',
    filledAt: '2025-07-08T16:45:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1001',
    tripNumber: null,
    stationName: 'Fleet Depot Fuel Center',
    odometer: 13820,
    liters: '62.100',
    price: '1.8300',
    filledAt: '2025-07-15T07:30:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1001',
    tripNumber: null,
    stationName: 'Interstate Fuel Hub',
    odometer: 14150,
    liters: '57.500',
    price: '1.8050',
    filledAt: '2025-07-22T13:20:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1002',
    tripNumber: 'TRIP-DEMO-002',
    stationName: 'Midwest Truck Stop',
    odometer: 8500,
    liters: '70.000',
    price: '1.7750',
    filledAt: '2025-06-10T10:00:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1002',
    tripNumber: null,
    stationName: 'Fleet Depot Fuel Center',
    odometer: 8920,
    liters: '65.500',
    price: '1.8400',
    filledAt: '2025-06-18T08:45:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1002',
    tripNumber: null,
    stationName: 'Interstate Fuel Hub',
    odometer: 9300,
    liters: '63.250',
    price: '1.8000',
    filledAt: '2025-06-26T15:10:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1002',
    tripNumber: null,
    stationName: 'Midwest Truck Stop',
    odometer: 9680,
    liters: '59.000',
    price: '1.7850',
    filledAt: '2025-07-04T12:00:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1002',
    tripNumber: null,
    stationName: 'Fleet Depot Fuel Center',
    odometer: 10050,
    liters: '66.750',
    price: '1.8550',
    filledAt: '2025-07-12T09:30:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1002',
    tripNumber: null,
    stationName: 'Interstate Fuel Hub',
    odometer: 10420,
    liters: '61.500',
    price: '1.8125',
    filledAt: '2025-07-20T17:00:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1003',
    tripNumber: null,
    stationName: 'Fleet Depot Fuel Center',
    odometer: 22000,
    liters: '80.000',
    price: '1.8700',
    filledAt: '2025-06-05T06:00:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1003',
    tripNumber: null,
    stationName: 'Midwest Truck Stop',
    odometer: 22350,
    liters: '75.500',
    price: '1.7900',
    filledAt: '2025-06-14T14:30:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1003',
    tripNumber: null,
    stationName: 'Interstate Fuel Hub',
    odometer: 22700,
    liters: '78.250',
    price: '1.8250',
    filledAt: '2025-06-22T11:15:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1003',
    tripNumber: null,
    stationName: 'Fleet Depot Fuel Center',
    odometer: 23080,
    liters: '72.000',
    price: '1.8600',
    filledAt: '2025-06-30T08:00:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1003',
    tripNumber: null,
    stationName: 'Midwest Truck Stop',
    odometer: 23420,
    liters: '74.750',
    price: '1.7950',
    filledAt: '2025-07-07T16:20:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1004',
    tripNumber: null,
    stationName: 'Fleet Depot Fuel Center',
    odometer: 45000,
    liters: '90.000',
    price: '1.9000',
    filledAt: '2025-05-20T10:00:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1004',
    tripNumber: null,
    stationName: 'Interstate Fuel Hub',
    odometer: 45380,
    liters: '85.500',
    price: '1.8800',
    filledAt: '2025-06-01T13:45:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1004',
    tripNumber: null,
    stationName: 'Midwest Truck Stop',
    odometer: 45720,
    liters: '88.250',
    price: '1.8650',
    filledAt: '2025-06-12T09:00:00.000Z',
  },
  {
    vehiclePlate: 'FLT-1001',
    tripNumber: null,
    stationName: 'Midwest Truck Stop',
    odometer: 14480,
    liters: '54.000',
    price: '1.7800',
    filledAt: '2025-07-28T18:00:00.000Z',
  },
] as const;

function calculateTotalCost(liters: string, price: string): Prisma.Decimal {
  return new Prisma.Decimal(liters)
    .mul(new Prisma.Decimal(price))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export async function seedFuel(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    context.logger.warn('Demo organization not found — skipping fuel seed');
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
    context.logger.warn('Demo dispatcher not found — skipping fuel seed');
    return;
  }

  const stationByName = new Map<string, string>();

  for (const station of DEMO_FUEL_STATIONS) {
    const saved = await context.prisma.fuelStation.upsert({
      where: { id: station.id },
      update: {
        name: station.name,
        location: station.location,
      },
      create: {
        id: station.id,
        organizationId: organization.id,
        name: station.name,
        location: station.location,
      },
    });

    stationByName.set(saved.name, saved.id);
  }

  let seededCount = 0;

  for (const [index, record] of DEMO_FUEL_RECORDS.entries()) {
    const vehicle = await context.prisma.vehicle.findFirst({
      where: { organizationId: organization.id, plateNumber: record.vehiclePlate },
    });

    if (!vehicle) {
      context.logger.warn(`Skipping fuel record — vehicle ${record.vehiclePlate} missing`);
      continue;
    }

    let tripId: string | undefined;

    if (record.tripNumber) {
      const trip = await context.prisma.trip.findUnique({
        where: {
          organizationId_tripNumber: {
            organizationId: organization.id,
            tripNumber: record.tripNumber,
          },
        },
      });

      tripId = trip?.id;
    }

    const fuelStationId = stationByName.get(record.stationName);
    const totalCost = calculateTotalCost(record.liters, record.price);
    const recordId = `b2000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;

    await context.prisma.fuelRecord.upsert({
      where: { id: recordId },
      update: {
        odometerReading: record.odometer,
        litersPurchased: new Prisma.Decimal(record.liters),
        pricePerLiter: new Prisma.Decimal(record.price),
        totalCost,
        filledAt: new Date(record.filledAt),
        tripId: tripId ?? null,
        fuelStationId: fuelStationId ?? null,
      },
      create: {
        id: recordId,
        organizationId: organization.id,
        vehicleId: vehicle.id,
        tripId: tripId ?? null,
        fuelStationId: fuelStationId ?? null,
        odometerReading: record.odometer,
        litersPurchased: new Prisma.Decimal(record.liters),
        pricePerLiter: new Prisma.Decimal(record.price),
        totalCost,
        filledAt: new Date(record.filledAt),
        createdByUserId: dispatcher.id,
      },
    });

    seededCount += 1;
  }

  context.logger.info(
    `Ensured ${DEMO_FUEL_STATIONS.length} fuel stations and ${seededCount} fuel records`,
  );
}

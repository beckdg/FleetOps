import { Prisma } from '@prisma/client';

export function calculateTotalCost(
  litersPurchased: Prisma.Decimal | string | number,
  pricePerLiter: Prisma.Decimal | string | number,
): Prisma.Decimal {
  return new Prisma.Decimal(litersPurchased)
    .mul(new Prisma.Decimal(pricePerLiter))
    .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function odometerRegressionErrorMessage(
  previousReading: number,
  newReading: number,
): string {
  return `Odometer reading cannot decrease (previous: ${previousReading}, new: ${newReading})`;
}

export function tripOrganizationMismatchMessage(): string {
  return 'Trip does not belong to the same organization';
}

export function tripVehicleMismatchMessage(): string {
  return 'Trip does not belong to the specified vehicle';
}

export function fuelStationOrganizationMismatchMessage(): string {
  return 'Fuel station does not belong to the same organization';
}

export interface FuelAnalyticsSnapshot {
  recordCount: number;
  totalLiters: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  minOdometer: number | null;
  maxOdometer: number | null;
  tripFuelRecordCount: number;
  uniqueTripCount: number;
}

export function buildFuelAnalyticsSnapshot(
  records: Array<{
    litersPurchased: Prisma.Decimal;
    totalCost: Prisma.Decimal;
    odometerReading: number;
    tripId: string | null;
  }>,
): FuelAnalyticsSnapshot {
  if (records.length === 0) {
    return {
      recordCount: 0,
      totalLiters: new Prisma.Decimal(0),
      totalCost: new Prisma.Decimal(0),
      minOdometer: null,
      maxOdometer: null,
      tripFuelRecordCount: 0,
      uniqueTripCount: 0,
    };
  }

  const firstRecord = records[0]!;

  let totalLiters = new Prisma.Decimal(0);
  let totalCost = new Prisma.Decimal(0);
  let minOdometer = firstRecord.odometerReading;
  let maxOdometer = firstRecord.odometerReading;
  let tripFuelRecordCount = 0;
  const uniqueTripIds = new Set<string>();

  for (const record of records) {
    totalLiters = totalLiters.add(record.litersPurchased);
    totalCost = totalCost.add(record.totalCost);
    minOdometer = Math.min(minOdometer, record.odometerReading);
    maxOdometer = Math.max(maxOdometer, record.odometerReading);

    if (record.tripId) {
      tripFuelRecordCount += 1;
      uniqueTripIds.add(record.tripId);
    }
  }

  return {
    recordCount: records.length,
    totalLiters,
    totalCost,
    minOdometer,
    maxOdometer,
    tripFuelRecordCount,
    uniqueTripCount: uniqueTripIds.size,
  };
}

export function calculateKilometersDriven(
  minOdometer: number | null,
  maxOdometer: number | null,
): number | null {
  if (minOdometer === null || maxOdometer === null) {
    return null;
  }

  const kilometers = maxOdometer - minOdometer;

  return kilometers > 0 ? kilometers : null;
}

export function calculateLitersPerKilometer(
  totalLiters: Prisma.Decimal,
  kilometersDriven: number | null,
): string | null {
  if (kilometersDriven === null || kilometersDriven <= 0) {
    return null;
  }

  return totalLiters
    .div(kilometersDriven)
    .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP)
    .toString();
}

export function calculateAverageCostPerKilometer(
  totalCost: Prisma.Decimal,
  kilometersDriven: number | null,
): string | null {
  if (kilometersDriven === null || kilometersDriven <= 0) {
    return null;
  }

  return totalCost
    .div(kilometersDriven)
    .toDecimalPlaces(4, Prisma.Decimal.ROUND_HALF_UP)
    .toString();
}

export function calculateAverageFuelPerTrip(
  totalLiters: Prisma.Decimal,
  uniqueTripCount: number,
): string | null {
  if (uniqueTripCount <= 0) {
    return null;
  }

  return totalLiters
    .div(uniqueTripCount)
    .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP)
    .toString();
}

import { BadRequestException } from '@nestjs/common';
import { DriverStatus, MaintenanceType, Prisma, TripStatus, VehicleStatus } from '@prisma/client';
import { ReportPeriod } from '@fleetops/shared-types';

import { ACTIVE_TRIP_STATUSES } from '../../trips/constants/trip.constants';
import { buildFuelAnalyticsSnapshot } from '../../fuel/constants/fuel.constants';

export interface ParsedReportDateRange {
  startDate?: Date;
  endDate?: Date;
}

export function parseReportDateRange(input: {
  startDate?: string;
  endDate?: string;
}): ParsedReportDateRange {
  const startDate = input.startDate ? new Date(input.startDate) : undefined;
  const endDate = input.endDate ? new Date(input.endDate) : undefined;

  if (startDate && Number.isNaN(startDate.getTime())) {
    throw new BadRequestException('Invalid startDate');
  }

  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new BadRequestException('Invalid endDate');
  }

  if (startDate && endDate && endDate < startDate) {
    throw new BadRequestException('endDate must be on or after startDate');
  }

  return { startDate, endDate };
}

export function toReportPeriod(range: ParsedReportDateRange): ReportPeriod {
  return {
    startDate: range.startDate?.toISOString() ?? null,
    endDate: range.endDate?.toISOString() ?? null,
  };
}

export function buildDateRangeFilter(
  range: ParsedReportDateRange,
): Prisma.DateTimeFilter | undefined {
  if (!range.startDate && !range.endDate) {
    return undefined;
  }

  return {
    ...(range.startDate ? { gte: range.startDate } : {}),
    ...(range.endDate ? { lte: range.endDate } : {}),
  };
}

export function isWithinDateRange(value: Date, range: ParsedReportDateRange): boolean {
  if (range.startDate && value < range.startDate) {
    return false;
  }

  if (range.endDate && value > range.endDate) {
    return false;
  }

  return true;
}

export function countVehiclesByStatus(
  vehicles: Array<{ status: VehicleStatus }>,
): Pick<
  import('@fleetops/shared-types').FleetSummaryReport,
  'totalVehicles' | 'activeVehicles' | 'vehiclesInMaintenance' | 'retiredVehicles'
> {
  return {
    totalVehicles: vehicles.length,
    activeVehicles: vehicles.filter((vehicle) => vehicle.status === VehicleStatus.ACTIVE).length,
    vehiclesInMaintenance: vehicles.filter(
      (vehicle) => vehicle.status === VehicleStatus.IN_MAINTENANCE,
    ).length,
    retiredVehicles: vehicles.filter((vehicle) => vehicle.status === VehicleStatus.RETIRED).length,
  };
}

export function countDriversByStatus(
  drivers: Array<{ status: DriverStatus }>,
): Pick<import('@fleetops/shared-types').FleetSummaryReport, 'totalDrivers' | 'activeDrivers'> {
  return {
    totalDrivers: drivers.length,
    activeDrivers: drivers.filter((driver) => driver.status === DriverStatus.ACTIVE).length,
  };
}

export function countTripsForFleetSummary(
  trips: Array<{ status: TripStatus; scheduledStartAt: Date }>,
  range: ParsedReportDateRange,
): Pick<
  import('@fleetops/shared-types').FleetSummaryReport,
  'activeTrips' | 'completedTrips' | 'cancelledTrips'
> {
  const filteredTrips = trips.filter((trip) => isWithinDateRange(trip.scheduledStartAt, range));

  return {
    activeTrips: filteredTrips.filter((trip) => ACTIVE_TRIP_STATUSES.includes(trip.status)).length,
    completedTrips: filteredTrips.filter((trip) => trip.status === TripStatus.COMPLETED).length,
    cancelledTrips: filteredTrips.filter((trip) => trip.status === TripStatus.CANCELLED).length,
  };
}

export function buildOrganizationFuelAnalytics(
  records: Array<{
    vehicleId: string;
    litersPurchased: Prisma.Decimal;
    totalCost: Prisma.Decimal;
    odometerReading: number;
    tripId: string | null;
  }>,
  vehicleCount: number,
): import('@fleetops/shared-types').FuelAnalyticsReport {
  const snapshot = buildFuelAnalyticsSnapshot(records);
  const costByVehicle = aggregateFuelCostByVehicle(records);

  const averageCostPerVehicle =
    vehicleCount > 0
      ? snapshot.totalCost
          .div(vehicleCount)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
          .toString()
      : costByVehicle.length > 0
        ? snapshot.totalCost
            .div(costByVehicle.length)
            .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
            .toString()
        : null;

  const highestFuelCostVehicle = pickExtremeVehicleCost(costByVehicle, 'highest');
  const lowestFuelCostVehicle = pickExtremeVehicleCost(costByVehicle, 'lowest');

  return {
    totalFuelCost: snapshot.totalCost.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toString(),
    totalFuelPurchased: snapshot.totalLiters
      .toDecimalPlaces(3, Prisma.Decimal.ROUND_HALF_UP)
      .toString(),
    averageCostPerVehicle,
    highestFuelCostVehicle,
    lowestFuelCostVehicle,
  };
}

function aggregateFuelCostByVehicle(
  records: Array<{ vehicleId: string; totalCost: Prisma.Decimal }>,
): Array<{ vehicleId: string; totalCost: Prisma.Decimal }> {
  const totals = new Map<string, Prisma.Decimal>();

  for (const record of records) {
    const current = totals.get(record.vehicleId) ?? new Prisma.Decimal(0);
    totals.set(record.vehicleId, current.add(record.totalCost));
  }

  return Array.from(totals.entries()).map(([vehicleId, totalCost]) => ({
    vehicleId,
    totalCost,
  }));
}

function pickExtremeVehicleCost(
  costByVehicle: Array<{ vehicleId: string; totalCost: Prisma.Decimal }>,
  direction: 'highest' | 'lowest',
): import('@fleetops/shared-types').VehicleFuelCostSummary | null {
  if (costByVehicle.length === 0) {
    return null;
  }

  const sorted = [...costByVehicle].sort((left, right) =>
    direction === 'highest'
      ? right.totalCost.comparedTo(left.totalCost)
      : left.totalCost.comparedTo(right.totalCost),
  );

  const selected = sorted[0]!;

  return {
    vehicleId: selected.vehicleId,
    totalCost: selected.totalCost.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toString(),
  };
}

export function buildMaintenanceAnalytics(
  records: Array<{
    maintenanceType: MaintenanceType;
    actualCost: Prisma.Decimal | null;
    status: import('@prisma/client').MaintenanceStatus;
  }>,
): import('@fleetops/shared-types').MaintenanceAnalyticsReport {
  const completedRecords = records.filter((record) => record.actualCost !== null);

  let totalMaintenanceCost = new Prisma.Decimal(0);

  for (const record of completedRecords) {
    totalMaintenanceCost = totalMaintenanceCost.add(record.actualCost!);
  }

  const averageMaintenanceCost =
    completedRecords.length > 0
      ? totalMaintenanceCost
          .div(completedRecords.length)
          .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
          .toString()
      : null;

  return {
    maintenanceCount: records.length,
    preventiveMaintenanceCount: records.filter(
      (record) => record.maintenanceType === MaintenanceType.PREVENTIVE,
    ).length,
    correctiveMaintenanceCount: records.filter(
      (record) => record.maintenanceType === MaintenanceType.CORRECTIVE,
    ).length,
    emergencyMaintenanceCount: records.filter(
      (record) => record.maintenanceType === MaintenanceType.EMERGENCY,
    ).length,
    totalMaintenanceCost: totalMaintenanceCost
      .toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)
      .toString(),
    averageMaintenanceCost,
  };
}

export function buildTripAnalytics(
  trips: Array<{
    status: TripStatus;
    actualStartAt: Date | null;
    actualEndAt: Date | null;
  }>,
): import('@fleetops/shared-types').TripAnalyticsReport {
  const completedTrips = trips.filter((trip) => trip.status === TripStatus.COMPLETED);
  const cancelledTrips = trips.filter((trip) => trip.status === TripStatus.CANCELLED);

  return {
    tripCount: trips.length,
    completedTripCount: completedTrips.length,
    cancelledTripCount: cancelledTrips.length,
    averageTripDurationMinutes: calculateAverageTripDurationMinutes(completedTrips),
    tripCompletionRate: calculateTripCompletionRate(completedTrips.length, cancelledTrips.length),
  };
}

export function calculateAverageTripDurationMinutes(
  trips: Array<{ actualStartAt: Date | null; actualEndAt: Date | null }>,
): number | null {
  const durations = trips
    .filter((trip) => trip.actualStartAt && trip.actualEndAt)
    .map((trip) => (trip.actualEndAt!.getTime() - trip.actualStartAt!.getTime()) / (1000 * 60));

  if (durations.length === 0) {
    return null;
  }

  const totalMinutes = durations.reduce((sum, duration) => sum + duration, 0);

  return Number((totalMinutes / durations.length).toFixed(2));
}

export function calculateTripCompletionRate(
  completedTripCount: number,
  cancelledTripCount: number,
): string | null {
  const denominator = completedTripCount + cancelledTripCount;

  if (denominator === 0) {
    return null;
  }

  return ((completedTripCount / denominator) * 100).toFixed(2);
}

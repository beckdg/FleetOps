import { BadRequestException } from '@nestjs/common';
import { MaintenanceType, Prisma, TripStatus } from '@prisma/client';

import {
  buildMaintenanceAnalytics,
  buildOrganizationFuelAnalytics,
  buildTripAnalytics,
  calculateAverageTripDurationMinutes,
  calculateTripCompletionRate,
  countTripsForFleetSummary,
  isWithinDateRange,
  parseReportDateRange,
} from './analytics.constants';

describe('Reporting analytics calculations', () => {
  describe('parseReportDateRange', () => {
    it('parses valid date ranges', () => {
      const range = parseReportDateRange({
        startDate: '2025-06-01T00:00:00.000Z',
        endDate: '2025-06-30T23:59:59.999Z',
      });

      expect(range.startDate?.toISOString()).toBe('2025-06-01T00:00:00.000Z');
      expect(range.endDate?.toISOString()).toBe('2025-06-30T23:59:59.999Z');
    });

    it('rejects invalid date ranges', () => {
      expect(() =>
        parseReportDateRange({
          startDate: '2025-06-30T00:00:00.000Z',
          endDate: '2025-06-01T00:00:00.000Z',
        }),
      ).toThrow(BadRequestException);
    });
  });

  describe('date filtering', () => {
    it('filters values within a date range', () => {
      const range = parseReportDateRange({
        startDate: '2025-06-10T00:00:00.000Z',
        endDate: '2025-06-20T00:00:00.000Z',
      });

      expect(isWithinDateRange(new Date('2025-06-15T00:00:00.000Z'), range)).toBe(true);
      expect(isWithinDateRange(new Date('2025-06-01T00:00:00.000Z'), range)).toBe(false);
    });

    it('counts fleet trip metrics within a date range', () => {
      const range = parseReportDateRange({
        startDate: '2025-06-10T00:00:00.000Z',
        endDate: '2025-06-20T00:00:00.000Z',
      });

      const counts = countTripsForFleetSummary(
        [
          {
            status: TripStatus.COMPLETED,
            scheduledStartAt: new Date('2025-06-15T08:00:00.000Z'),
          },
          {
            status: TripStatus.CANCELLED,
            scheduledStartAt: new Date('2025-06-16T08:00:00.000Z'),
          },
          {
            status: TripStatus.IN_PROGRESS,
            scheduledStartAt: new Date('2025-06-01T08:00:00.000Z'),
          },
        ],
        range,
      );

      expect(counts.completedTrips).toBe(1);
      expect(counts.cancelledTrips).toBe(1);
      expect(counts.activeTrips).toBe(0);
    });
  });

  describe('fuel analytics', () => {
    it('aggregates organization fuel analytics', () => {
      const analytics = buildOrganizationFuelAnalytics(
        [
          {
            vehicleId: 'vehicle-a',
            litersPurchased: new Prisma.Decimal('50'),
            totalCost: new Prisma.Decimal('90.00'),
            odometerReading: 10000,
            tripId: null,
          },
          {
            vehicleId: 'vehicle-b',
            litersPurchased: new Prisma.Decimal('30'),
            totalCost: new Prisma.Decimal('54.00'),
            odometerReading: 20000,
            tripId: null,
          },
          {
            vehicleId: 'vehicle-a',
            litersPurchased: new Prisma.Decimal('20'),
            totalCost: new Prisma.Decimal('36.00'),
            odometerReading: 10400,
            tripId: null,
          },
        ],
        2,
      );

      expect(analytics.totalFuelCost).toBe('180');
      expect(analytics.totalFuelPurchased).toBe('100');
      expect(analytics.averageCostPerVehicle).toBe('90');
      expect(analytics.highestFuelCostVehicle?.vehicleId).toBe('vehicle-a');
      expect(analytics.lowestFuelCostVehicle?.vehicleId).toBe('vehicle-b');
    });
  });

  describe('maintenance analytics', () => {
    it('aggregates maintenance metrics', () => {
      const analytics = buildMaintenanceAnalytics([
        {
          maintenanceType: MaintenanceType.PREVENTIVE,
          actualCost: new Prisma.Decimal('100.00'),
          status: 'COMPLETED' as never,
        },
        {
          maintenanceType: MaintenanceType.CORRECTIVE,
          actualCost: new Prisma.Decimal('200.00'),
          status: 'COMPLETED' as never,
        },
        {
          maintenanceType: MaintenanceType.EMERGENCY,
          actualCost: null,
          status: 'SCHEDULED' as never,
        },
      ]);

      expect(analytics.maintenanceCount).toBe(3);
      expect(analytics.preventiveMaintenanceCount).toBe(1);
      expect(analytics.correctiveMaintenanceCount).toBe(1);
      expect(analytics.emergencyMaintenanceCount).toBe(1);
      expect(analytics.totalMaintenanceCost).toBe('300');
      expect(analytics.averageMaintenanceCost).toBe('150');
    });
  });

  describe('trip analytics', () => {
    it('calculates average trip duration', () => {
      const average = calculateAverageTripDurationMinutes([
        {
          actualStartAt: new Date('2025-06-10T08:00:00.000Z'),
          actualEndAt: new Date('2025-06-10T10:00:00.000Z'),
        },
        {
          actualStartAt: new Date('2025-06-11T08:00:00.000Z'),
          actualEndAt: new Date('2025-06-11T12:00:00.000Z'),
        },
      ]);

      expect(average).toBe(180);
    });

    it('calculates trip completion rate', () => {
      expect(calculateTripCompletionRate(3, 1)).toBe('75.00');
      expect(calculateTripCompletionRate(0, 0)).toBeNull();
    });

    it('builds trip analytics report', () => {
      const analytics = buildTripAnalytics([
        {
          status: TripStatus.COMPLETED,
          actualStartAt: new Date('2025-06-10T08:00:00.000Z'),
          actualEndAt: new Date('2025-06-10T10:00:00.000Z'),
        },
        {
          status: TripStatus.CANCELLED,
          actualStartAt: null,
          actualEndAt: null,
        },
      ]);

      expect(analytics.tripCount).toBe(2);
      expect(analytics.completedTripCount).toBe(1);
      expect(analytics.cancelledTripCount).toBe(1);
      expect(analytics.averageTripDurationMinutes).toBe(120);
      expect(analytics.tripCompletionRate).toBe('50.00');
    });
  });
});

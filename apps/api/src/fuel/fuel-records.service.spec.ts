import { Prisma } from '@prisma/client';

import {
  buildFuelAnalyticsSnapshot,
  calculateAverageCostPerKilometer,
  calculateAverageFuelPerTrip,
  calculateKilometersDriven,
  calculateLitersPerKilometer,
  calculateTotalCost,
  odometerRegressionErrorMessage,
} from './constants/fuel.constants';
import { FuelRecordService } from './fuel-records.service';

describe('Fuel domain validation', () => {
  describe('calculateTotalCost', () => {
    it('computes total cost from liters and price per liter', () => {
      expect(calculateTotalCost('65.500', '1.8500').toString()).toBe('121.18');
    });

    it('rounds to two decimal places', () => {
      expect(calculateTotalCost('10.333', '1.9999').toString()).toBe('20.66');
    });
  });

  describe('odometer validation', () => {
    it('rejects decreasing odometer readings', () => {
      const service = new FuelRecordService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );

      expect(() => service.assertOdometerNotDecreasing(10000, 9999)).toThrow(
        odometerRegressionErrorMessage(10000, 9999),
      );
    });

    it('allows equal or increasing odometer readings', () => {
      const service = new FuelRecordService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );

      expect(() => service.assertOdometerNotDecreasing(10000, 10000)).not.toThrow();
      expect(() => service.assertOdometerNotDecreasing(10000, 10050)).not.toThrow();
      expect(() => service.assertOdometerNotDecreasing(null, 10000)).not.toThrow();
    });
  });

  describe('analytics calculations', () => {
    const records = [
      {
        litersPurchased: new Prisma.Decimal('50.000'),
        totalCost: new Prisma.Decimal('90.00'),
        odometerReading: 10000,
        tripId: 'trip-1',
      },
      {
        litersPurchased: new Prisma.Decimal('60.000'),
        totalCost: new Prisma.Decimal('108.00'),
        odometerReading: 10400,
        tripId: 'trip-2',
      },
      {
        litersPurchased: new Prisma.Decimal('40.000'),
        totalCost: new Prisma.Decimal('72.00'),
        odometerReading: 10700,
        tripId: null,
      },
    ];

    it('builds analytics snapshot from fuel records', () => {
      const snapshot = buildFuelAnalyticsSnapshot(records);

      expect(snapshot.recordCount).toBe(3);
      expect(snapshot.totalLiters.toString()).toBe('150');
      expect(snapshot.totalCost.toString()).toBe('270');
      expect(snapshot.minOdometer).toBe(10000);
      expect(snapshot.maxOdometer).toBe(10700);
      expect(snapshot.tripFuelRecordCount).toBe(2);
      expect(snapshot.uniqueTripCount).toBe(2);
    });

    it('calculates liters per kilometer', () => {
      const snapshot = buildFuelAnalyticsSnapshot(records);
      const kilometers = calculateKilometersDriven(snapshot.minOdometer, snapshot.maxOdometer);

      expect(kilometers).toBe(700);
      expect(calculateLitersPerKilometer(snapshot.totalLiters, kilometers)).toBe('0.2143');
    });

    it('calculates average cost per kilometer', () => {
      const snapshot = buildFuelAnalyticsSnapshot(records);
      const kilometers = calculateKilometersDriven(snapshot.minOdometer, snapshot.maxOdometer);

      expect(calculateAverageCostPerKilometer(snapshot.totalCost, kilometers)).toBe('0.3857');
    });

    it('calculates average fuel per trip', () => {
      const snapshot = buildFuelAnalyticsSnapshot(records);

      expect(calculateAverageFuelPerTrip(snapshot.totalLiters, snapshot.uniqueTripCount)).toBe(
        '75',
      );
    });

    it('returns null analytics when insufficient data', () => {
      const snapshot = buildFuelAnalyticsSnapshot([]);

      expect(calculateKilometersDriven(snapshot.minOdometer, snapshot.maxOdometer)).toBeNull();
      expect(calculateLitersPerKilometer(snapshot.totalLiters, null)).toBeNull();
      expect(calculateAverageCostPerKilometer(snapshot.totalCost, null)).toBeNull();
      expect(
        calculateAverageFuelPerTrip(snapshot.totalLiters, snapshot.uniqueTripCount),
      ).toBeNull();
    });
  });
});

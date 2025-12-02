import { TripStatus } from '@prisma/client';

import {
  assertAllowedTripTransition,
  isAllowedTripTransition,
  tripsOverlap,
} from './trip.constants';

describe('Trip domain constants', () => {
  describe('status transitions', () => {
    it('allows the documented lifecycle transitions', () => {
      expect(isAllowedTripTransition(TripStatus.PLANNED, TripStatus.DISPATCHED)).toBe(true);
      expect(isAllowedTripTransition(TripStatus.DISPATCHED, TripStatus.IN_PROGRESS)).toBe(true);
      expect(isAllowedTripTransition(TripStatus.IN_PROGRESS, TripStatus.COMPLETED)).toBe(true);
      expect(isAllowedTripTransition(TripStatus.PLANNED, TripStatus.CANCELLED)).toBe(true);
      expect(isAllowedTripTransition(TripStatus.DISPATCHED, TripStatus.CANCELLED)).toBe(true);
    });

    it('rejects invalid transitions', () => {
      expect(isAllowedTripTransition(TripStatus.PLANNED, TripStatus.COMPLETED)).toBe(false);
      expect(isAllowedTripTransition(TripStatus.IN_PROGRESS, TripStatus.CANCELLED)).toBe(false);
      expect(isAllowedTripTransition(TripStatus.COMPLETED, TripStatus.PLANNED)).toBe(false);

      expect(() => assertAllowedTripTransition(TripStatus.PLANNED, TripStatus.COMPLETED)).toThrow(
        'Invalid trip status transition from PLANNED to COMPLETED',
      );
    });
  });

  describe('overlap validation', () => {
    it('detects overlapping windows', () => {
      const firstStart = new Date('2026-06-10T08:00:00.000Z');
      const firstEnd = new Date('2026-06-10T12:00:00.000Z');
      const secondStart = new Date('2026-06-10T10:00:00.000Z');
      const secondEnd = new Date('2026-06-10T14:00:00.000Z');

      expect(tripsOverlap(firstStart, firstEnd, secondStart, secondEnd)).toBe(true);
    });

    it('allows adjacent non-overlapping windows', () => {
      const firstStart = new Date('2026-06-10T08:00:00.000Z');
      const firstEnd = new Date('2026-06-10T12:00:00.000Z');
      const secondStart = new Date('2026-06-10T12:00:00.000Z');
      const secondEnd = new Date('2026-06-10T16:00:00.000Z');

      expect(tripsOverlap(firstStart, firstEnd, secondStart, secondEnd)).toBe(false);
    });
  });
});

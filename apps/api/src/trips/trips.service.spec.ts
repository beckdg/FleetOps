import { BadRequestException } from '@nestjs/common';
import { TripStatus } from '@prisma/client';

import {
  intervalsOverlap,
  isAllowedTripTransition,
  transitionErrorMessage,
} from './constants/trip.constants';
import { TripService } from './trips.service';

describe('Trip domain validation', () => {
  describe('status transitions', () => {
    it('allows PLANNED -> DISPATCHED and PLANNED -> CANCELLED', () => {
      expect(isAllowedTripTransition(TripStatus.PLANNED, TripStatus.DISPATCHED)).toBe(true);
      expect(isAllowedTripTransition(TripStatus.PLANNED, TripStatus.CANCELLED)).toBe(true);
    });

    it('allows DISPATCHED -> IN_PROGRESS and DISPATCHED -> CANCELLED', () => {
      expect(isAllowedTripTransition(TripStatus.DISPATCHED, TripStatus.IN_PROGRESS)).toBe(true);
      expect(isAllowedTripTransition(TripStatus.DISPATCHED, TripStatus.CANCELLED)).toBe(true);
    });

    it('allows IN_PROGRESS -> COMPLETED', () => {
      expect(isAllowedTripTransition(TripStatus.IN_PROGRESS, TripStatus.COMPLETED)).toBe(true);
    });

    it.each([
      [TripStatus.PLANNED, TripStatus.IN_PROGRESS],
      [TripStatus.PLANNED, TripStatus.COMPLETED],
      [TripStatus.DISPATCHED, TripStatus.COMPLETED],
      [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
      [TripStatus.COMPLETED, TripStatus.PLANNED],
      [TripStatus.CANCELLED, TripStatus.DISPATCHED],
    ])('rejects invalid transition %s -> %s', (from, to) => {
      expect(isAllowedTripTransition(from, to)).toBe(false);
    });
  });

  describe('schedule overlap', () => {
    it('detects overlapping intervals', () => {
      const startA = new Date('2025-06-10T08:00:00.000Z');
      const endA = new Date('2025-06-10T12:00:00.000Z');
      const startB = new Date('2025-06-10T10:00:00.000Z');
      const endB = new Date('2025-06-10T14:00:00.000Z');

      expect(intervalsOverlap(startA, endA, startB, endB)).toBe(true);
    });

    it('does not treat adjacent intervals as overlapping', () => {
      const startA = new Date('2025-06-10T08:00:00.000Z');
      const endA = new Date('2025-06-10T12:00:00.000Z');
      const startB = new Date('2025-06-10T12:00:00.000Z');
      const endB = new Date('2025-06-10T16:00:00.000Z');

      expect(intervalsOverlap(startA, endA, startB, endB)).toBe(false);
    });
  });

  describe('TripService validation helpers', () => {
    let service: TripService;

    beforeEach(() => {
      service = new TripService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
      );
    });

    it('rejects invalid status transitions via assertAllowedTransition', () => {
      expect(() =>
        service.assertAllowedTransition(TripStatus.PLANNED, TripStatus.COMPLETED),
      ).toThrow(BadRequestException);
      expect(() =>
        service.assertAllowedTransition(TripStatus.PLANNED, TripStatus.COMPLETED),
      ).toThrow(transitionErrorMessage(TripStatus.PLANNED, TripStatus.COMPLETED));
    });

    it('rejects schedules where end is not after start', () => {
      const start = new Date('2025-06-10T12:00:00.000Z');
      const end = new Date('2025-06-10T08:00:00.000Z');

      expect(() => service.assertValidSchedule(start, end)).toThrow(BadRequestException);
    });
  });
});

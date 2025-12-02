import { TripEventType, TripStatus } from '@prisma/client';

export const ACTIVE_TRIP_STATUSES: TripStatus[] = [
  TripStatus.PLANNED,
  TripStatus.DISPATCHED,
  TripStatus.IN_PROGRESS,
];

export const ALLOWED_TRIP_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  [TripStatus.PLANNED]: [TripStatus.DISPATCHED, TripStatus.CANCELLED],
  [TripStatus.DISPATCHED]: [TripStatus.IN_PROGRESS, TripStatus.CANCELLED],
  [TripStatus.IN_PROGRESS]: [TripStatus.COMPLETED],
  [TripStatus.COMPLETED]: [],
  [TripStatus.CANCELLED]: [],
};

export const STATUS_TO_EVENT_TYPE: Partial<Record<TripStatus, TripEventType>> = {
  [TripStatus.DISPATCHED]: TripEventType.TRIP_DISPATCHED,
  [TripStatus.IN_PROGRESS]: TripEventType.TRIP_STARTED,
  [TripStatus.COMPLETED]: TripEventType.TRIP_COMPLETED,
  [TripStatus.CANCELLED]: TripEventType.TRIP_CANCELLED,
};

export function isAllowedTripTransition(from: TripStatus, to: TripStatus): boolean {
  return ALLOWED_TRIP_TRANSITIONS[from].includes(to);
}

export function assertAllowedTripTransition(from: TripStatus, to: TripStatus): void {
  if (!isAllowedTripTransition(from, to)) {
    throw new Error(transitionErrorMessage(from, to));
  }
}

export function intervalsOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

export function transitionErrorMessage(from: TripStatus, to: TripStatus): string {
  return `Invalid trip status transition from ${from} to ${to}`;
}

export const tripsOverlap = intervalsOverlap;

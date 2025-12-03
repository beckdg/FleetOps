import { Trip } from '@prisma/client';
import { TripResponse } from '@fleetops/shared-types';

export function toTripResponse(trip: Trip): TripResponse {
  return {
    id: trip.id,
    organizationId: trip.organizationId,
    vehicleId: trip.vehicleId,
    driverId: trip.driverId,
    tripNumber: trip.tripNumber,
    origin: trip.origin,
    destination: trip.destination,
    scheduledStartAt: trip.scheduledStartAt.toISOString(),
    scheduledEndAt: trip.scheduledEndAt.toISOString(),
    actualStartAt: trip.actualStartAt?.toISOString() ?? null,
    actualEndAt: trip.actualEndAt?.toISOString() ?? null,
    status: trip.status,
    createdByUserId: trip.createdByUserId,
    createdAt: trip.createdAt.toISOString(),
    updatedAt: trip.updatedAt.toISOString(),
  };
}

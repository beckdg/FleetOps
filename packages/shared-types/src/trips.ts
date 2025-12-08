export type TripStatus = 'PLANNED' | 'DISPATCHED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type TripEventType =
  | 'TRIP_CREATED'
  | 'TRIP_DISPATCHED'
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'TRIP_CANCELLED';

export interface TripResponse {
  id: string;
  organizationId: string;
  vehicleId: string;
  driverId: string;
  tripNumber: string;
  origin: string;
  destination: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  actualStartAt: string | null;
  actualEndAt: string | null;
  status: TripStatus;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TripEventResponse {
  id: string;
  tripId: string;
  eventType: TripEventType;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
}

import { Injectable } from '@nestjs/common';
import { TripEvent, TripEventType } from '@prisma/client';
import { TripEventResponse } from '@fleetops/shared-types';

import { TripEventRepository } from './trip-events.repository';

export interface RecordTripEventInput {
  tripId: string;
  eventType: TripEventType;
  createdByUserId: string;
  notes?: string;
}

@Injectable()
export class TripEventService {
  constructor(private readonly tripEventRepository: TripEventRepository) {}

  async recordEvent(input: RecordTripEventInput): Promise<TripEventResponse> {
    const event = await this.tripEventRepository.create(input);
    return toTripEventResponse(event);
  }

  async findByTripId(tripId: string): Promise<TripEventResponse[]> {
    const events = await this.tripEventRepository.findByTripId(tripId);
    return events.map(toTripEventResponse);
  }
}

function toTripEventResponse(event: TripEvent): TripEventResponse {
  return {
    id: event.id,
    tripId: event.tripId,
    eventType: event.eventType,
    notes: event.notes,
    createdByUserId: event.createdByUserId,
    createdAt: event.createdAt.toISOString(),
  };
}

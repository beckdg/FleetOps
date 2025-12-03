import { Injectable } from '@nestjs/common';
import { TripEvent, TripEventType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateTripEventData {
  tripId: string;
  eventType: TripEventType;
  createdByUserId: string;
  notes?: string;
}

@Injectable()
export class TripEventRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateTripEventData): Promise<TripEvent> {
    return this.prisma.tripEvent.create({
      data: {
        tripId: data.tripId,
        eventType: data.eventType,
        createdByUserId: data.createdByUserId,
        notes: data.notes,
      },
    });
  }

  findByTripId(tripId: string): Promise<TripEvent[]> {
    return this.prisma.tripEvent.findMany({
      where: { tripId },
      orderBy: [{ createdAt: 'asc' }],
    });
  }
}

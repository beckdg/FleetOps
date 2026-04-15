import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, Trip, TripEvent, TripEventType, TripStatus } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { ACTIVE_TRIP_STATUSES } from './constants/trip.constants';

export interface CreateTripData {
  organizationId: string;
  vehicleId: string;
  driverId: string;
  tripNumber: string;
  origin: string;
  destination: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  createdByUserId: string;
}

export interface UpdateTripStatusData {
  status: TripStatus;
  actualStartAt?: Date | null;
  actualEndAt?: Date | null;
}

export interface CreateTripEventData {
  eventType: TripEventType;
  createdByUserId: string;
  notes?: string;
}

@Injectable()
export class TripRepository {
  constructor(private readonly prisma: PrismaService) {}

  createWithEvent(
    data: CreateTripData,
    event: CreateTripEventData,
  ): Promise<{ trip: Trip; event: TripEvent }> {
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          organizationId: data.organizationId,
          vehicleId: data.vehicleId,
          driverId: data.driverId,
          tripNumber: data.tripNumber,
          origin: data.origin,
          destination: data.destination,
          scheduledStartAt: data.scheduledStartAt,
          scheduledEndAt: data.scheduledEndAt,
          createdByUserId: data.createdByUserId,
          status: TripStatus.PLANNED,
        },
      });

      const tripEvent = await tx.tripEvent.create({
        data: {
          tripId: trip.id,
          eventType: event.eventType,
          createdByUserId: event.createdByUserId,
          notes: event.notes,
        },
      });

      return { trip, event: tripEvent };
    });
  }

  transitionWithEvent(
    tripId: string,
    organizationId: string,
    statusUpdate: UpdateTripStatusData,
    event: CreateTripEventData | null,
  ): Promise<Trip> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.trip.findFirst({
        where: { id: tripId, organizationId },
      });

      if (!existing) {
        throw new NotFoundException(`Trip ${tripId} not found in organization ${organizationId}`);
      }

      const trip = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: statusUpdate.status,
          actualStartAt: statusUpdate.actualStartAt,
          actualEndAt: statusUpdate.actualEndAt,
        },
      });

      if (event) {
        await tx.tripEvent.create({
          data: {
            tripId: trip.id,
            eventType: event.eventType,
            createdByUserId: event.createdByUserId,
            notes: event.notes,
          },
        });
      }

      return trip;
    });
  }

  create(data: CreateTripData): Promise<Trip> {
    return this.prisma.trip.create({
      data: {
        organizationId: data.organizationId,
        vehicleId: data.vehicleId,
        driverId: data.driverId,
        tripNumber: data.tripNumber,
        origin: data.origin,
        destination: data.destination,
        scheduledStartAt: data.scheduledStartAt,
        scheduledEndAt: data.scheduledEndAt,
        createdByUserId: data.createdByUserId,
        status: TripStatus.PLANNED,
      },
    });
  }

  findById(id: string): Promise<Trip | null> {
    return this.prisma.trip.findUnique({ where: { id } });
  }

  findByOrganization(organizationId: string): Promise<Trip[]> {
    return this.prisma.trip.findMany({
      where: { organizationId },
      orderBy: [{ scheduledStartAt: 'desc' }],
    });
  }

  findByOrganizationInDateRange(
    organizationId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Trip[]> {
    return this.prisma.trip.findMany({
      where: {
        organizationId,
        ...(startDate || endDate
          ? {
              scheduledStartAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: [{ scheduledStartAt: 'desc' }],
    });
  }

  findActiveByOrganization(organizationId: string): Promise<Trip[]> {
    return this.prisma.trip.findMany({
      where: {
        organizationId,
        status: { in: ACTIVE_TRIP_STATUSES },
      },
      orderBy: [{ scheduledStartAt: 'asc' }],
    });
  }

  findOverlappingForVehicle(
    organizationId: string,
    vehicleId: string,
    scheduledStartAt: Date,
    scheduledEndAt: Date,
    excludeTripId?: string,
  ): Promise<Trip[]> {
    return this.prisma.trip.findMany({
      where: {
        organizationId,
        vehicleId,
        status: { in: ACTIVE_TRIP_STATUSES },
        scheduledStartAt: { lt: scheduledEndAt },
        scheduledEndAt: { gt: scheduledStartAt },
        ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
      },
    });
  }

  findOverlappingForDriver(
    organizationId: string,
    driverId: string,
    scheduledStartAt: Date,
    scheduledEndAt: Date,
    excludeTripId?: string,
  ): Promise<Trip[]> {
    return this.prisma.trip.findMany({
      where: {
        organizationId,
        driverId,
        status: { in: ACTIVE_TRIP_STATUSES },
        scheduledStartAt: { lt: scheduledEndAt },
        scheduledEndAt: { gt: scheduledStartAt },
        ...(excludeTripId ? { id: { not: excludeTripId } } : {}),
      },
    });
  }

  updateStatus(id: string, data: UpdateTripStatusData): Promise<Trip> {
    return this.prisma.trip.update({
      where: { id },
      data: {
        status: data.status,
        actualStartAt: data.actualStartAt,
        actualEndAt: data.actualEndAt,
      },
    });
  }

  requireById(id: string): Promise<Trip> {
    return this.findById(id).then((trip) => {
      if (!trip) {
        throw new NotFoundException(`Trip ${id} not found`);
      }

      return trip;
    });
  }

  requireInOrganization(tripId: string, organizationId: string): Promise<Trip> {
    return this.prisma.trip.findFirst({ where: { id: tripId, organizationId } }).then((trip) => {
      if (!trip) {
        throw new NotFoundException(`Trip ${tripId} not found in organization ${organizationId}`);
      }

      return trip;
    });
  }

  isUniqueConstraintError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
  }

  isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }
}

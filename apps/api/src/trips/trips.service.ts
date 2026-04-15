import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Trip, TripEventType, TripStatus, VehicleStatus } from '@prisma/client';
import { TripResponse } from '@fleetops/shared-types';

import { DriverRepository } from '../drivers/drivers.repository';
import { FleetAuditService } from '../fleet/fleet-audit.service';
import { WEBHOOK_EVENT_TYPES } from '../integrations/constants/integrations.constants';
import { WebhookPublisherService } from '../integrations/webhook-publisher.service';
import { NotificationEventService } from '../notifications/notification-events.service';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { UserRepository } from '../users/users.repository';
import { tripBlockedByMaintenanceMessage } from '../vehicles/constants/vehicle.constants';
import { VehicleAssignmentRepository } from '../vehicle-assignments/vehicle-assignments.repository';
import { VehicleRepository } from '../vehicles/vehicles.repository';
import {
  isAllowedTripTransition,
  STATUS_TO_EVENT_TYPE,
  transitionErrorMessage,
} from './constants/trip.constants';
import { TripEventService } from './trip-events.service';
import { CreateTripData, TripRepository } from './trips.repository';
import { toTripResponse } from './trips.mapper';

export interface CreateTripInput {
  organizationId: string;
  vehicleId: string;
  driverId: string;
  tripNumber: string;
  origin: string;
  destination: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  createdByUserId: string;
}

export interface TripActionInput {
  organizationId: string;
  tripId: string;
  actorUserId: string;
  notes?: string;
}

@Injectable()
export class TripService {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly tripEventService: TripEventService,
    private readonly vehicleRepository: VehicleRepository,
    private readonly driverRepository: DriverRepository,
    private readonly vehicleAssignmentRepository: VehicleAssignmentRepository,
    private readonly organizationRepository: OrganizationRepository,
    private readonly userRepository: UserRepository,
    private readonly fleetAuditService: FleetAuditService,
    private readonly notificationEventService: NotificationEventService,
    private readonly webhookPublisherService: WebhookPublisherService,
  ) {}

  async createTrip(input: CreateTripInput): Promise<TripResponse> {
    await this.organizationRepository.requireById(input.organizationId);
    await this.userRepository.requireActiveInOrganization(
      input.createdByUserId,
      input.organizationId,
    );

    await this.driverRepository.requireInOrganization(input.driverId, input.organizationId);

    const vehicle = await this.vehicleRepository.requireInOrganization(
      input.vehicleId,
      input.organizationId,
    );
    this.assertVehicleAvailableForTrip(vehicle.status);

    await this.assertActiveAssignmentMatches(input);

    const scheduledStartAt = new Date(input.scheduledStartAt);
    const scheduledEndAt = new Date(input.scheduledEndAt);

    this.assertValidSchedule(scheduledStartAt, scheduledEndAt);
    await this.assertNoOverlappingTrips(
      input.organizationId,
      input.vehicleId,
      input.driverId,
      scheduledStartAt,
      scheduledEndAt,
    );

    const data: CreateTripData = {
      organizationId: input.organizationId,
      vehicleId: input.vehicleId,
      driverId: input.driverId,
      tripNumber: input.tripNumber,
      origin: input.origin,
      destination: input.destination,
      scheduledStartAt,
      scheduledEndAt,
      createdByUserId: input.createdByUserId,
    };

    try {
      const { trip } = await this.tripRepository.createWithEvent(data, {
        eventType: TripEventType.TRIP_CREATED,
        createdByUserId: input.createdByUserId,
      });

      this.fleetAuditService.logTripCreated({
        organizationId: trip.organizationId,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
        createdByUserId: input.createdByUserId,
      });

      await this.webhookPublisherService.publish(
        trip.organizationId,
        WEBHOOK_EVENT_TYPES.TRIP_CREATED,
        this.buildTripWebhookPayload(trip),
      );

      return toTripResponse(trip);
    } catch (error) {
      if (this.tripRepository.isUniqueConstraintError(error)) {
        throw new ConflictException('Trip number already exists in this organization');
      }

      throw error;
    }
  }

  async dispatchTrip(input: TripActionInput): Promise<TripResponse> {
    return this.transitionTrip(input, TripStatus.DISPATCHED, (trip, actorUserId) => {
      this.fleetAuditService.logTripDispatched({
        organizationId: trip.organizationId,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        dispatchedByUserId: actorUserId,
      });
    });
  }

  async startTrip(input: TripActionInput): Promise<TripResponse> {
    return this.transitionTrip(
      input,
      TripStatus.IN_PROGRESS,
      async (trip, actorUserId) => {
        this.fleetAuditService.logTripStarted({
          organizationId: trip.organizationId,
          tripId: trip.id,
          tripNumber: trip.tripNumber,
          startedByUserId: actorUserId,
        });

        await this.notificationEventService.onTripStarted(trip, trip.createdByUserId);

        await this.webhookPublisherService.publish(
          trip.organizationId,
          WEBHOOK_EVENT_TYPES.TRIP_STARTED,
          this.buildTripWebhookPayload(trip),
        );
      },
      { actualStartAt: new Date() },
    );
  }

  async completeTrip(input: TripActionInput): Promise<TripResponse> {
    return this.transitionTrip(
      input,
      TripStatus.COMPLETED,
      async (trip, actorUserId) => {
        this.fleetAuditService.logTripCompleted({
          organizationId: trip.organizationId,
          tripId: trip.id,
          tripNumber: trip.tripNumber,
          completedByUserId: actorUserId,
        });

        await this.notificationEventService.onTripCompleted(trip, trip.createdByUserId);

        await this.webhookPublisherService.publish(
          trip.organizationId,
          WEBHOOK_EVENT_TYPES.TRIP_COMPLETED,
          this.buildTripWebhookPayload(trip),
        );
      },
      { actualEndAt: new Date() },
    );
  }

  async cancelTrip(input: TripActionInput): Promise<TripResponse> {
    return this.transitionTrip(input, TripStatus.CANCELLED, (trip, actorUserId) => {
      this.fleetAuditService.logTripCancelled({
        organizationId: trip.organizationId,
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        cancelledByUserId: actorUserId,
      });
    });
  }

  async getActiveTrips(organizationId: string): Promise<TripResponse[]> {
    await this.organizationRepository.requireById(organizationId);
    const trips = await this.tripRepository.findActiveByOrganization(organizationId);
    return trips.map(toTripResponse);
  }

  async findByOrganization(organizationId: string): Promise<TripResponse[]> {
    await this.organizationRepository.requireById(organizationId);
    const trips = await this.tripRepository.findByOrganization(organizationId);
    return trips.map(toTripResponse);
  }

  assertAllowedTransition(from: TripStatus, to: TripStatus): void {
    if (!isAllowedTripTransition(from, to)) {
      throw new BadRequestException(transitionErrorMessage(from, to));
    }
  }

  assertVehicleAvailableForTrip(status: VehicleStatus): void {
    if (status === VehicleStatus.IN_MAINTENANCE) {
      throw new BadRequestException(tripBlockedByMaintenanceMessage());
    }
  }

  assertValidSchedule(scheduledStartAt: Date, scheduledEndAt: Date): void {
    if (Number.isNaN(scheduledStartAt.getTime()) || Number.isNaN(scheduledEndAt.getTime())) {
      throw new BadRequestException('Invalid trip schedule');
    }

    if (scheduledEndAt <= scheduledStartAt) {
      throw new BadRequestException('Trip scheduled end must be after scheduled start');
    }
  }

  async assertActiveAssignmentMatches(input: {
    organizationId: string;
    vehicleId: string;
    driverId: string;
  }): Promise<void> {
    const assignment = await this.vehicleAssignmentRepository.findActiveByVehicleId(
      input.vehicleId,
    );

    if (!assignment || assignment.organizationId !== input.organizationId) {
      throw new BadRequestException('Vehicle does not have an active assignment');
    }

    if (assignment.driverId !== input.driverId) {
      throw new BadRequestException('Trip driver does not match the active vehicle assignment');
    }
  }

  async assertNoOverlappingTrips(
    organizationId: string,
    vehicleId: string,
    driverId: string,
    scheduledStartAt: Date,
    scheduledEndAt: Date,
    excludeTripId?: string,
  ): Promise<void> {
    const vehicleOverlaps = await this.tripRepository.findOverlappingForVehicle(
      organizationId,
      vehicleId,
      scheduledStartAt,
      scheduledEndAt,
      excludeTripId,
    );

    if (vehicleOverlaps.length > 0) {
      throw new ConflictException('Vehicle has an overlapping trip');
    }

    const driverOverlaps = await this.tripRepository.findOverlappingForDriver(
      organizationId,
      driverId,
      scheduledStartAt,
      scheduledEndAt,
      excludeTripId,
    );

    if (driverOverlaps.length > 0) {
      throw new ConflictException('Driver has an overlapping trip');
    }
  }

  private async transitionTrip(
    input: TripActionInput,
    targetStatus: TripStatus,
    audit: (trip: Trip, actorUserId: string) => void | Promise<void>,
    timestamps: { actualStartAt?: Date; actualEndAt?: Date } = {},
  ): Promise<TripResponse> {
    await this.userRepository.requireActiveInOrganization(input.actorUserId, input.organizationId);

    const trip = await this.tripRepository.requireInOrganization(
      input.tripId,
      input.organizationId,
    );

    this.assertAllowedTransition(trip.status, targetStatus);

    const eventType = STATUS_TO_EVENT_TYPE[targetStatus];

    try {
      const updated = await this.tripRepository.transitionWithEvent(
        trip.id,
        input.organizationId,
        {
          status: targetStatus,
          actualStartAt: timestamps.actualStartAt ?? trip.actualStartAt,
          actualEndAt: timestamps.actualEndAt ?? trip.actualEndAt,
        },
        eventType
          ? {
              eventType,
              createdByUserId: input.actorUserId,
              notes: input.notes,
            }
          : null,
      );

      await audit(updated, input.actorUserId);

      return toTripResponse(updated);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (this.tripRepository.isNotFoundError(error)) {
        throw new NotFoundException(`Trip ${input.tripId} not found`);
      }

      throw error;
    }
  }

  private buildTripWebhookPayload(trip: Trip): Record<string, unknown> {
    return {
      tripId: trip.id,
      tripNumber: trip.tripNumber,
      vehicleId: trip.vehicleId,
      driverId: trip.driverId,
      status: trip.status,
      origin: trip.origin,
      destination: trip.destination,
    };
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { DriverStatus, VehicleStatus } from '@prisma/client';

export type FleetAuditEvent =
  | 'vehicle_status_changed'
  | 'driver_status_changed'
  | 'vehicle_assigned'
  | 'vehicle_assignment_ended'
  | 'trip_created'
  | 'trip_dispatched'
  | 'trip_started'
  | 'trip_completed'
  | 'trip_cancelled';

@Injectable()
export class FleetAuditService {
  private readonly logger = new Logger('FleetAudit');

  logVehicleStatusChanged(entry: {
    organizationId: string;
    vehicleId: string;
    previousStatus: VehicleStatus;
    newStatus: VehicleStatus;
    changedByUserId: string;
  }): void {
    this.log('vehicle_status_changed', {
      organizationId: entry.organizationId,
      vehicleId: entry.vehicleId,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      changedByUserId: entry.changedByUserId,
    });
  }

  logDriverStatusChanged(entry: {
    organizationId: string;
    driverId: string;
    previousStatus: DriverStatus;
    newStatus: DriverStatus;
    changedByUserId: string;
  }): void {
    this.log('driver_status_changed', {
      organizationId: entry.organizationId,
      driverId: entry.driverId,
      previousStatus: entry.previousStatus,
      newStatus: entry.newStatus,
      changedByUserId: entry.changedByUserId,
    });
  }

  logVehicleAssigned(entry: {
    organizationId: string;
    assignmentId: string;
    vehicleId: string;
    driverId: string;
    assignedByUserId: string;
  }): void {
    this.log('vehicle_assigned', {
      organizationId: entry.organizationId,
      assignmentId: entry.assignmentId,
      vehicleId: entry.vehicleId,
      driverId: entry.driverId,
      assignedByUserId: entry.assignedByUserId,
    });
  }

  logVehicleAssignmentEnded(entry: {
    organizationId: string;
    assignmentId: string;
    vehicleId: string;
    driverId: string;
    endedByUserId: string;
  }): void {
    this.log('vehicle_assignment_ended', {
      organizationId: entry.organizationId,
      assignmentId: entry.assignmentId,
      vehicleId: entry.vehicleId,
      driverId: entry.driverId,
      endedByUserId: entry.endedByUserId,
    });
  }

  logTripCreated(entry: {
    organizationId: string;
    tripId: string;
    tripNumber: string;
    vehicleId: string;
    driverId: string;
    createdByUserId: string;
  }): void {
    this.log('trip_created', {
      organizationId: entry.organizationId,
      tripId: entry.tripId,
      tripNumber: entry.tripNumber,
      vehicleId: entry.vehicleId,
      driverId: entry.driverId,
      createdByUserId: entry.createdByUserId,
    });
  }

  logTripDispatched(entry: {
    organizationId: string;
    tripId: string;
    tripNumber: string;
    dispatchedByUserId: string;
  }): void {
    this.log('trip_dispatched', {
      organizationId: entry.organizationId,
      tripId: entry.tripId,
      tripNumber: entry.tripNumber,
      dispatchedByUserId: entry.dispatchedByUserId,
    });
  }

  logTripStarted(entry: {
    organizationId: string;
    tripId: string;
    tripNumber: string;
    startedByUserId: string;
  }): void {
    this.log('trip_started', {
      organizationId: entry.organizationId,
      tripId: entry.tripId,
      tripNumber: entry.tripNumber,
      startedByUserId: entry.startedByUserId,
    });
  }

  logTripCompleted(entry: {
    organizationId: string;
    tripId: string;
    tripNumber: string;
    completedByUserId: string;
  }): void {
    this.log('trip_completed', {
      organizationId: entry.organizationId,
      tripId: entry.tripId,
      tripNumber: entry.tripNumber,
      completedByUserId: entry.completedByUserId,
    });
  }

  logTripCancelled(entry: {
    organizationId: string;
    tripId: string;
    tripNumber: string;
    cancelledByUserId: string;
  }): void {
    this.log('trip_cancelled', {
      organizationId: entry.organizationId,
      tripId: entry.tripId,
      tripNumber: entry.tripNumber,
      cancelledByUserId: entry.cancelledByUserId,
    });
  }

  private log(event: FleetAuditEvent, payload: Record<string, string>): void {
    this.logger.log(JSON.stringify({ event, ...payload }));
  }
}

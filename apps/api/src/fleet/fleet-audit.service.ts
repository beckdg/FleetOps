import { Injectable, Logger } from '@nestjs/common';
import { DriverStatus, VehicleStatus } from '@prisma/client';

import { AuditEventStore } from '../operations/audit/audit-event.store';
import { RequestContextService } from '../operations/request-context/request-context.service';

export type FleetAuditEvent =
  | 'vehicle_status_changed'
  | 'driver_status_changed'
  | 'vehicle_assigned'
  | 'vehicle_assignment_ended'
  | 'trip_created'
  | 'trip_dispatched'
  | 'trip_started'
  | 'trip_completed'
  | 'trip_cancelled'
  | 'maintenance_scheduled'
  | 'maintenance_started'
  | 'maintenance_completed'
  | 'maintenance_cancelled'
  | 'inspection_created'
  | 'fuel_record_created'
  | 'fuel_station_created'
  | 'notification_created'
  | 'notification_read'
  | 'preferences_updated'
  | 'report_generated'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'webhook_created'
  | 'webhook_updated'
  | 'webhook_delivery_success'
  | 'webhook_delivery_failed'
  | 'job_created'
  | 'job_completed'
  | 'job_failed';

@Injectable()
export class FleetAuditService {
  private readonly logger = new Logger('FleetAudit');

  constructor(
    private readonly auditEventStore: AuditEventStore,
    private readonly requestContextService: RequestContextService,
  ) {}

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

  logMaintenanceScheduled(entry: {
    organizationId: string;
    maintenanceId: string;
    vehicleId: string;
    createdByUserId: string;
  }): void {
    this.log('maintenance_scheduled', {
      organizationId: entry.organizationId,
      maintenanceId: entry.maintenanceId,
      vehicleId: entry.vehicleId,
      createdByUserId: entry.createdByUserId,
    });
  }

  logMaintenanceStarted(entry: {
    organizationId: string;
    maintenanceId: string;
    vehicleId: string;
    startedByUserId: string;
  }): void {
    this.log('maintenance_started', {
      organizationId: entry.organizationId,
      maintenanceId: entry.maintenanceId,
      vehicleId: entry.vehicleId,
      startedByUserId: entry.startedByUserId,
    });
  }

  logMaintenanceCompleted(entry: {
    organizationId: string;
    maintenanceId: string;
    vehicleId: string;
    completedByUserId: string;
  }): void {
    this.log('maintenance_completed', {
      organizationId: entry.organizationId,
      maintenanceId: entry.maintenanceId,
      vehicleId: entry.vehicleId,
      completedByUserId: entry.completedByUserId,
    });
  }

  logMaintenanceCancelled(entry: {
    organizationId: string;
    maintenanceId: string;
    vehicleId: string;
    cancelledByUserId: string;
  }): void {
    this.log('maintenance_cancelled', {
      organizationId: entry.organizationId,
      maintenanceId: entry.maintenanceId,
      vehicleId: entry.vehicleId,
      cancelledByUserId: entry.cancelledByUserId,
    });
  }

  logInspectionCreated(entry: {
    organizationId: string;
    inspectionId: string;
    vehicleId: string;
    passed: boolean;
    createdByUserId: string;
  }): void {
    this.log('inspection_created', {
      organizationId: entry.organizationId,
      inspectionId: entry.inspectionId,
      vehicleId: entry.vehicleId,
      passed: String(entry.passed),
      createdByUserId: entry.createdByUserId,
    });
  }

  logFuelRecordCreated(entry: {
    organizationId: string;
    fuelRecordId: string;
    vehicleId: string;
    tripId: string | null;
    totalCost: string;
    createdByUserId: string;
  }): void {
    this.log('fuel_record_created', {
      organizationId: entry.organizationId,
      fuelRecordId: entry.fuelRecordId,
      vehicleId: entry.vehicleId,
      tripId: entry.tripId ?? '',
      totalCost: entry.totalCost,
      createdByUserId: entry.createdByUserId,
    });
  }

  logFuelStationCreated(entry: {
    organizationId: string;
    fuelStationId: string;
    name: string;
  }): void {
    this.log('fuel_station_created', {
      organizationId: entry.organizationId,
      fuelStationId: entry.fuelStationId,
      name: entry.name,
    });
  }

  logNotificationCreated(entry: {
    organizationId: string;
    notificationId: string;
    userId: string;
    type: string;
  }): void {
    this.log('notification_created', {
      organizationId: entry.organizationId,
      notificationId: entry.notificationId,
      userId: entry.userId,
      type: entry.type,
    });
  }

  logNotificationRead(entry: {
    organizationId: string;
    notificationId: string;
    userId: string;
  }): void {
    this.log('notification_read', {
      organizationId: entry.organizationId,
      notificationId: entry.notificationId,
      userId: entry.userId,
    });
  }

  logNotificationPreferencesUpdated(entry: { organizationId: string; userId: string }): void {
    this.log('preferences_updated', {
      organizationId: entry.organizationId,
      userId: entry.userId,
    });
  }

  logReportGenerated(entry: {
    organizationId: string;
    reportType: string;
    requestedByUserId: string;
  }): void {
    this.log('report_generated', {
      organizationId: entry.organizationId,
      reportType: entry.reportType,
      requestedByUserId: entry.requestedByUserId,
    });
  }

  logApiKeyCreated(entry: {
    organizationId: string;
    apiKeyId: string;
    name: string;
    createdByUserId: string;
  }): void {
    this.log('api_key_created', {
      organizationId: entry.organizationId,
      apiKeyId: entry.apiKeyId,
      name: entry.name,
      createdByUserId: entry.createdByUserId,
    });
  }

  logApiKeyRevoked(entry: {
    organizationId: string;
    apiKeyId: string;
    revokedByUserId: string;
  }): void {
    this.log('api_key_revoked', {
      organizationId: entry.organizationId,
      apiKeyId: entry.apiKeyId,
      revokedByUserId: entry.revokedByUserId,
    });
  }

  logWebhookCreated(entry: {
    organizationId: string;
    webhookEndpointId: string;
    name: string;
    createdByUserId: string;
  }): void {
    this.log('webhook_created', {
      organizationId: entry.organizationId,
      webhookEndpointId: entry.webhookEndpointId,
      name: entry.name,
      createdByUserId: entry.createdByUserId,
    });
  }

  logWebhookUpdated(entry: {
    organizationId: string;
    webhookEndpointId: string;
    updatedByUserId: string;
  }): void {
    this.log('webhook_updated', {
      organizationId: entry.organizationId,
      webhookEndpointId: entry.webhookEndpointId,
      updatedByUserId: entry.updatedByUserId,
    });
  }

  logWebhookDeliverySuccess(entry: {
    organizationId: string;
    webhookEndpointId: string;
    webhookEventId: string;
    deliveryId: string;
    attemptNumber: number;
  }): void {
    this.log('webhook_delivery_success', {
      organizationId: entry.organizationId,
      webhookEndpointId: entry.webhookEndpointId,
      webhookEventId: entry.webhookEventId,
      deliveryId: entry.deliveryId,
      attemptNumber: String(entry.attemptNumber),
    });
  }

  logWebhookDeliveryFailed(entry: {
    organizationId: string;
    webhookEndpointId: string;
    webhookEventId: string;
    deliveryId: string;
    attemptNumber: number;
  }): void {
    this.log('webhook_delivery_failed', {
      organizationId: entry.organizationId,
      webhookEndpointId: entry.webhookEndpointId,
      webhookEventId: entry.webhookEventId,
      deliveryId: entry.deliveryId,
      attemptNumber: String(entry.attemptNumber),
    });
  }

  logJobCreated(entry: {
    organizationId: string;
    jobId: string;
    jobType: string;
    queueName: string;
  }): void {
    this.log('job_created', {
      organizationId: entry.organizationId,
      jobId: entry.jobId,
      jobType: entry.jobType,
      queueName: entry.queueName,
    });
  }

  logJobCompleted(entry: {
    organizationId: string;
    jobId: string;
    jobType: string;
    attemptCount: number;
  }): void {
    this.log('job_completed', {
      organizationId: entry.organizationId,
      jobId: entry.jobId,
      jobType: entry.jobType,
      attemptCount: String(entry.attemptCount),
    });
  }

  logJobFailed(entry: {
    organizationId: string;
    jobId: string;
    jobType: string;
    attemptCount: number;
    failureReason: string;
  }): void {
    this.log('job_failed', {
      organizationId: entry.organizationId,
      jobId: entry.jobId,
      jobType: entry.jobType,
      attemptCount: String(entry.attemptCount),
      failureReason: entry.failureReason,
    });
  }

  private log(event: FleetAuditEvent, payload: Record<string, string>): void {
    const requestId = this.requestContextService.getRequestId();
    const enrichedPayload = requestId ? { ...payload, requestId } : payload;

    this.auditEventStore.append(event, payload, requestId);
    this.logger.log(JSON.stringify({ event, ...enrichedPayload }));
  }
}

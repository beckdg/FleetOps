import { Injectable } from '@nestjs/common';
import { FuelRecord, Inspection, MaintenanceRecord, NotificationType, Trip } from '@prisma/client';

import {
  fuelRecordCreatedNotificationContent,
  inspectionFailedNotificationContent,
  maintenanceCompletedNotificationContent,
  maintenanceStartedNotificationContent,
  tripCompletedNotificationContent,
  tripStartedNotificationContent,
} from './constants/notification.constants';
import { NotificationService } from './notifications.service';

@Injectable()
export class NotificationEventService {
  constructor(private readonly notificationService: NotificationService) {}

  async onTripStarted(trip: Trip, recipientUserId: string): Promise<void> {
    const content = tripStartedNotificationContent(trip.tripNumber);

    await this.notificationService.createNotification({
      organizationId: trip.organizationId,
      userId: recipientUserId,
      type: NotificationType.TRIP_STARTED,
      title: content.title,
      message: content.message,
      metadata: {
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
      },
    });
  }

  async onTripCompleted(trip: Trip, recipientUserId: string): Promise<void> {
    const content = tripCompletedNotificationContent(trip.tripNumber);

    await this.notificationService.createNotification({
      organizationId: trip.organizationId,
      userId: recipientUserId,
      type: NotificationType.TRIP_COMPLETED,
      title: content.title,
      message: content.message,
      metadata: {
        tripId: trip.id,
        tripNumber: trip.tripNumber,
        vehicleId: trip.vehicleId,
        driverId: trip.driverId,
      },
    });
  }

  async onMaintenanceStarted(record: MaintenanceRecord, recipientUserId: string): Promise<void> {
    const content = maintenanceStartedNotificationContent(record.title);

    await this.notificationService.createNotification({
      organizationId: record.organizationId,
      userId: recipientUserId,
      type: NotificationType.MAINTENANCE_STARTED,
      title: content.title,
      message: content.message,
      metadata: {
        maintenanceId: record.id,
        vehicleId: record.vehicleId,
        maintenanceType: record.maintenanceType,
      },
    });
  }

  async onMaintenanceCompleted(record: MaintenanceRecord, recipientUserId: string): Promise<void> {
    const content = maintenanceCompletedNotificationContent(record.title);

    await this.notificationService.createNotification({
      organizationId: record.organizationId,
      userId: recipientUserId,
      type: NotificationType.MAINTENANCE_COMPLETED,
      title: content.title,
      message: content.message,
      metadata: {
        maintenanceId: record.id,
        vehicleId: record.vehicleId,
        maintenanceType: record.maintenanceType,
      },
    });
  }

  async onInspectionFailed(inspection: Inspection, recipientUserId: string): Promise<void> {
    const content = inspectionFailedNotificationContent(inspection.inspectorName);

    await this.notificationService.createNotification({
      organizationId: inspection.organizationId,
      userId: recipientUserId,
      type: NotificationType.INSPECTION_FAILED,
      title: content.title,
      message: content.message,
      metadata: {
        inspectionId: inspection.id,
        vehicleId: inspection.vehicleId,
        passed: inspection.passed,
        notes: inspection.notes,
      },
    });
  }

  async onFuelRecordCreated(record: FuelRecord, recipientUserId: string): Promise<void> {
    const content = fuelRecordCreatedNotificationContent(record.totalCost.toString());

    await this.notificationService.createNotification({
      organizationId: record.organizationId,
      userId: recipientUserId,
      type: NotificationType.FUEL_RECORD_CREATED,
      title: content.title,
      message: content.message,
      metadata: {
        fuelRecordId: record.id,
        vehicleId: record.vehicleId,
        tripId: record.tripId,
        totalCost: record.totalCost.toString(),
      },
    });
  }
}

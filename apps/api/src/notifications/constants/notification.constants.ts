import { NotificationType } from '@prisma/client';

export const NOTIFICATION_TYPE_TO_PREFERENCE_FIELD = {
  [NotificationType.TRIP_STARTED]: 'tripNotifications',
  [NotificationType.TRIP_COMPLETED]: 'tripNotifications',
  [NotificationType.MAINTENANCE_STARTED]: 'maintenanceNotifications',
  [NotificationType.MAINTENANCE_COMPLETED]: 'maintenanceNotifications',
  [NotificationType.INSPECTION_FAILED]: 'inspectionNotifications',
  [NotificationType.FUEL_RECORD_CREATED]: 'fuelNotifications',
  [NotificationType.SYSTEM]: 'systemNotifications',
} as const;

export type NotificationPreferenceField =
  (typeof NOTIFICATION_TYPE_TO_PREFERENCE_FIELD)[NotificationType];

export function isNotificationTypeEnabled(
  preferences: Record<NotificationPreferenceField, boolean>,
  type: NotificationType,
): boolean {
  const field = NOTIFICATION_TYPE_TO_PREFERENCE_FIELD[type];
  return preferences[field];
}

export function tripStartedNotificationContent(tripNumber: string): {
  title: string;
  message: string;
} {
  return {
    title: 'Trip started',
    message: `Trip ${tripNumber} is now in progress.`,
  };
}

export function tripCompletedNotificationContent(tripNumber: string): {
  title: string;
  message: string;
} {
  return {
    title: 'Trip completed',
    message: `Trip ${tripNumber} has been completed.`,
  };
}

export function maintenanceStartedNotificationContent(title: string): {
  title: string;
  message: string;
} {
  return {
    title: 'Maintenance started',
    message: `Maintenance "${title}" is now in progress.`,
  };
}

export function maintenanceCompletedNotificationContent(title: string): {
  title: string;
  message: string;
} {
  return {
    title: 'Maintenance completed',
    message: `Maintenance "${title}" has been completed.`,
  };
}

export function inspectionFailedNotificationContent(inspectorName: string): {
  title: string;
  message: string;
} {
  return {
    title: 'Inspection failed',
    message: `Vehicle inspection by ${inspectorName} did not pass.`,
  };
}

export function fuelRecordCreatedNotificationContent(totalCost: string): {
  title: string;
  message: string;
} {
  return {
    title: 'Fuel record created',
    message: `A fuel purchase of ${totalCost} was recorded.`,
  };
}

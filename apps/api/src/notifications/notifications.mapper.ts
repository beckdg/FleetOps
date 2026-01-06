import { Notification, NotificationPreference } from '@prisma/client';
import { NotificationPreferenceResponse, NotificationResponse } from '@fleetops/shared-types';

export function toNotificationResponse(notification: Notification): NotificationResponse {
  return {
    id: notification.id,
    organizationId: notification.organizationId,
    userId: notification.userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    readAt: notification.readAt?.toISOString() ?? null,
    metadata:
      notification.metadata && typeof notification.metadata === 'object'
        ? (notification.metadata as Record<string, unknown>)
        : null,
    createdAt: notification.createdAt.toISOString(),
  };
}

export function toNotificationPreferenceResponse(
  preference: NotificationPreference,
): NotificationPreferenceResponse {
  return {
    id: preference.id,
    userId: preference.userId,
    tripNotifications: preference.tripNotifications,
    maintenanceNotifications: preference.maintenanceNotifications,
    inspectionNotifications: preference.inspectionNotifications,
    fuelNotifications: preference.fuelNotifications,
    systemNotifications: preference.systemNotifications,
    createdAt: preference.createdAt.toISOString(),
    updatedAt: preference.updatedAt.toISOString(),
  };
}

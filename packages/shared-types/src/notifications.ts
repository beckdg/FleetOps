export type NotificationType =
  | 'TRIP_STARTED'
  | 'TRIP_COMPLETED'
  | 'MAINTENANCE_STARTED'
  | 'MAINTENANCE_COMPLETED'
  | 'INSPECTION_FAILED'
  | 'FUEL_RECORD_CREATED'
  | 'SYSTEM';

export interface NotificationResponse {
  id: string;
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface NotificationPreferenceResponse {
  id: string;
  userId: string;
  tripNotifications: boolean;
  maintenanceNotifications: boolean;
  inspectionNotifications: boolean;
  fuelNotifications: boolean;
  systemNotifications: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNotificationPreferenceInput {
  tripNotifications?: boolean;
  maintenanceNotifications?: boolean;
  inspectionNotifications?: boolean;
  fuelNotifications?: boolean;
  systemNotifications?: boolean;
}

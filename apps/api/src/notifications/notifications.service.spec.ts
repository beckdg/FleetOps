import { NotificationType } from '@prisma/client';

import {
  isNotificationTypeEnabled,
  tripStartedNotificationContent,
} from './constants/notification.constants';
import { NotificationService } from './notifications.service';

describe('Notification domain validation', () => {
  describe('preference filtering', () => {
    it('maps notification types to preference fields', () => {
      expect(
        isNotificationTypeEnabled(
          {
            tripNotifications: true,
            maintenanceNotifications: false,
            inspectionNotifications: true,
            fuelNotifications: false,
            systemNotifications: true,
          },
          NotificationType.TRIP_STARTED,
        ),
      ).toBe(true);

      expect(
        isNotificationTypeEnabled(
          {
            tripNotifications: true,
            maintenanceNotifications: false,
            inspectionNotifications: true,
            fuelNotifications: false,
            systemNotifications: true,
          },
          NotificationType.MAINTENANCE_STARTED,
        ),
      ).toBe(false);
    });
  });

  describe('notification generation content', () => {
    it('builds trip started notification content', () => {
      const content = tripStartedNotificationContent('TRIP-001');

      expect(content.title).toBe('Trip started');
      expect(content.message).toContain('TRIP-001');
    });
  });

  describe('mark read logic', () => {
    it('returns existing notification when already read', async () => {
      const readAt = new Date('2025-06-01T10:00:00.000Z');
      const notification = {
        id: 'notification-id',
        organizationId: 'org-id',
        userId: 'user-id',
        type: NotificationType.SYSTEM,
        title: 'Already read',
        message: 'No update needed',
        readAt,
        metadata: null,
        createdAt: new Date('2025-06-01T09:00:00.000Z'),
      };

      const notificationRepository = {
        requireForUser: jest.fn().mockResolvedValue(notification),
        markAsRead: jest.fn(),
      };

      const service = new NotificationService(
        notificationRepository as never,
        {} as never,
        {} as never,
        {} as never,
      );

      const result = await service.markAsRead('org-id', 'user-id', 'notification-id');

      expect(result.readAt).toBe(readAt.toISOString());
      expect(notificationRepository.markAsRead).not.toHaveBeenCalled();
    });
  });
});

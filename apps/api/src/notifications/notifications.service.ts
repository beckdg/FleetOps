import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { NotificationResponse } from '@fleetops/shared-types';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { UserRepository } from '../users/users.repository';
import { NotificationPreferenceService } from './notification-preferences.service';
import { CreateNotificationData, NotificationRepository } from './notifications.repository';
import { toNotificationResponse } from './notifications.mapper';

export interface CreateNotificationInput {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class NotificationService {
  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly notificationPreferenceService: NotificationPreferenceService,
    private readonly userRepository: UserRepository,
    private readonly fleetAuditService: FleetAuditService,
  ) {}

  async createNotification(input: CreateNotificationInput): Promise<NotificationResponse | null> {
    await this.userRepository.requireActiveInOrganization(input.userId, input.organizationId);

    const enabled = await this.notificationPreferenceService.isEnabledForType(
      input.userId,
      input.type,
    );

    if (!enabled) {
      return null;
    }

    const data: CreateNotificationData = {
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    };

    const notification = await this.notificationRepository.create(data);

    this.fleetAuditService.logNotificationCreated({
      organizationId: notification.organizationId,
      notificationId: notification.id,
      userId: notification.userId,
      type: notification.type,
    });

    return toNotificationResponse(notification);
  }

  async getNotifications(organizationId: string, userId: string): Promise<NotificationResponse[]> {
    await this.userRepository.requireActiveInOrganization(userId, organizationId);
    const notifications = await this.notificationRepository.findByUser(organizationId, userId);
    return notifications.map(toNotificationResponse);
  }

  async getUnreadNotifications(
    organizationId: string,
    userId: string,
  ): Promise<NotificationResponse[]> {
    await this.userRepository.requireActiveInOrganization(userId, organizationId);
    const notifications = await this.notificationRepository.findUnreadByUser(
      organizationId,
      userId,
    );
    return notifications.map(toNotificationResponse);
  }

  async markAsRead(
    organizationId: string,
    userId: string,
    notificationId: string,
  ): Promise<NotificationResponse> {
    const notification = await this.notificationRepository.requireForUser(
      notificationId,
      organizationId,
      userId,
    );

    if (notification.readAt) {
      return toNotificationResponse(notification);
    }

    try {
      const updated = await this.notificationRepository.markAsRead(notificationId, new Date());

      this.fleetAuditService.logNotificationRead({
        organizationId,
        notificationId,
        userId,
      });

      return toNotificationResponse(updated);
    } catch (error) {
      if (this.notificationRepository.isNotFoundError(error)) {
        throw new BadRequestException(`Notification ${notificationId} could not be updated`);
      }

      throw error;
    }
  }

  async markAllAsRead(organizationId: string, userId: string): Promise<number> {
    await this.userRepository.requireActiveInOrganization(userId, organizationId);

    const readCount = await this.notificationRepository.markAllAsRead(
      organizationId,
      userId,
      new Date(),
    );

    if (readCount > 0) {
      this.fleetAuditService.logNotificationRead({
        organizationId,
        notificationId: 'all',
        userId,
      });
    }

    return readCount;
  }
}

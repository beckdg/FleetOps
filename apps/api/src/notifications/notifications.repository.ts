import { Injectable, NotFoundException } from '@nestjs/common';
import { Notification, NotificationType, Prisma } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface CreateNotificationData {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateNotificationData): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  findByUser(organizationId: string, userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { organizationId, userId },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  findUnreadByUser(organizationId: string, userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { organizationId, userId, readAt: null },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  markAsRead(id: string, readAt: Date): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: { readAt },
    });
  }

  markAllAsRead(organizationId: string, userId: string, readAt: Date): Promise<number> {
    return this.prisma.notification
      .updateMany({
        where: { organizationId, userId, readAt: null },
        data: { readAt },
      })
      .then((result) => result.count);
  }

  requireForUser(
    notificationId: string,
    organizationId: string,
    userId: string,
  ): Promise<Notification> {
    return this.prisma.notification
      .findUnique({ where: { id: notificationId } })
      .then((notification) => {
        if (
          !notification ||
          notification.organizationId !== organizationId ||
          notification.userId !== userId
        ) {
          throw new NotFoundException(`Notification ${notificationId} not found`);
        }

        return notification;
      });
  }

  isNotFoundError(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
  }
}

import { Injectable } from '@nestjs/common';
import { NotificationPreference } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';

export interface UpdateNotificationPreferenceData {
  tripNotifications?: boolean;
  maintenanceNotifications?: boolean;
  inspectionNotifications?: boolean;
  fuelNotifications?: boolean;
  systemNotifications?: boolean;
}

@Injectable()
export class NotificationPreferenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<NotificationPreference | null> {
    return this.prisma.notificationPreference.findUnique({ where: { userId } });
  }

  createDefaults(userId: string): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.create({ data: { userId } });
  }

  update(userId: string, data: UpdateNotificationPreferenceData): Promise<NotificationPreference> {
    return this.prisma.notificationPreference.update({
      where: { userId },
      data,
    });
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { DriverStatus, JobType, MaintenanceStatus, NotificationType } from '@prisma/client';

import { PrismaService } from '../database/prisma.service';
import { licenseExpiryReminderNotificationContent } from '../notifications/constants/notification.constants';
import { RoleRepository } from '../roles/roles.repository';
import {
  LICENSE_EXPIRY_REMINDER_DAYS,
  MAINTENANCE_REMINDER_DAYS,
} from './constants/queue.constants';
import { MaintenanceReminderQueueService } from './maintenance-reminder-queue.service';
import { NotificationQueueService } from './notification-queue.service';

@Injectable()
export class ReminderGenerationService {
  private readonly logger = new Logger(ReminderGenerationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly roleRepository: RoleRepository,
    private readonly notificationQueueService: NotificationQueueService,
    private readonly maintenanceReminderQueueService: MaintenanceReminderQueueService,
  ) {}

  async generateLicenseExpiryReminders(referenceDate = new Date()): Promise<number> {
    const windowEnd = this.addDays(referenceDate, LICENSE_EXPIRY_REMINDER_DAYS);
    const startOfToday = this.startOfDay(referenceDate);

    const drivers = await this.prisma.driver.findMany({
      where: {
        status: DriverStatus.ACTIVE,
        licenseExpiryDate: {
          gte: startOfToday,
          lte: windowEnd,
        },
      },
    });

    if (drivers.length === 0) {
      return 0;
    }

    const organizationIds = [...new Set(drivers.map((driver) => driver.organizationId))];
    const recipients =
      await this.roleRepository.findActiveAdminUserIdsByOrganizationIds(organizationIds);

    let enqueued = 0;

    for (const driver of drivers) {
      const recipientUserId = recipients.get(driver.organizationId);

      if (!recipientUserId) {
        this.logger.warn(
          `Skipping license reminder for driver ${driver.id} — no active admin recipient`,
        );
        continue;
      }

      const content = licenseExpiryReminderNotificationContent(
        `${driver.firstName} ${driver.lastName}`,
        driver.licenseExpiryDate,
      );

      await this.notificationQueueService.enqueueNotification({
        organizationId: driver.organizationId,
        userId: recipientUserId,
        type: NotificationType.SYSTEM,
        title: content.title,
        message: content.message,
        metadata: {
          driverId: driver.id,
          licenseExpiryDate: driver.licenseExpiryDate.toISOString(),
        },
        jobType: JobType.LICENSE_EXPIRY_REMINDER,
      });

      enqueued += 1;
    }

    return enqueued;
  }

  async generateMaintenanceReminders(referenceDate = new Date()): Promise<number> {
    const windowEnd = this.addDays(referenceDate, MAINTENANCE_REMINDER_DAYS);
    const startOfToday = this.startOfDay(referenceDate);

    const records = await this.prisma.maintenanceRecord.findMany({
      where: {
        status: MaintenanceStatus.SCHEDULED,
        scheduledAt: {
          gte: startOfToday,
          lte: windowEnd,
        },
      },
    });

    let enqueued = 0;

    for (const record of records) {
      await this.maintenanceReminderQueueService.enqueueReminder({
        organizationId: record.organizationId,
        maintenanceRecordId: record.id,
        recipientUserId: record.createdByUserId,
      });

      enqueued += 1;
    }

    return enqueued;
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setUTCDate(result.getUTCDate() + days);
    return result;
  }

  private startOfDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }
}

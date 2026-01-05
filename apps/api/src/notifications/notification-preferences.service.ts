import { BadRequestException, Injectable } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import {
  NotificationPreferenceResponse,
  UpdateNotificationPreferenceInput,
} from '@fleetops/shared-types';

import { FleetAuditService } from '../fleet/fleet-audit.service';
import { UserRepository } from '../users/users.repository';
import { isNotificationTypeEnabled } from './constants/notification.constants';
import {
  NotificationPreferenceRepository,
  UpdateNotificationPreferenceData,
} from './notification-preferences.repository';
import { toNotificationPreferenceResponse } from './notifications.mapper';

@Injectable()
export class NotificationPreferenceService {
  constructor(
    private readonly notificationPreferenceRepository: NotificationPreferenceRepository,
    private readonly userRepository: UserRepository,
    private readonly fleetAuditService: FleetAuditService,
  ) {}

  async getPreferences(
    organizationId: string,
    userId: string,
  ): Promise<NotificationPreferenceResponse> {
    await this.userRepository.requireActiveInOrganization(userId, organizationId);
    const preferences = await this.ensurePreferences(userId);
    return toNotificationPreferenceResponse(preferences);
  }

  async updatePreferences(
    organizationId: string,
    userId: string,
    input: UpdateNotificationPreferenceInput,
  ): Promise<NotificationPreferenceResponse> {
    await this.userRepository.requireActiveInOrganization(userId, organizationId);
    await this.ensurePreferences(userId);

    const data: UpdateNotificationPreferenceData = {
      tripNotifications: input.tripNotifications,
      maintenanceNotifications: input.maintenanceNotifications,
      inspectionNotifications: input.inspectionNotifications,
      fuelNotifications: input.fuelNotifications,
      systemNotifications: input.systemNotifications,
    };

    if (Object.values(data).every((value) => value === undefined)) {
      throw new BadRequestException('At least one preference must be provided');
    }

    const updated = await this.notificationPreferenceRepository.update(userId, data);

    this.fleetAuditService.logNotificationPreferencesUpdated({
      organizationId,
      userId,
    });

    return toNotificationPreferenceResponse(updated);
  }

  async isEnabledForType(userId: string, type: NotificationType): Promise<boolean> {
    const preferences = await this.ensurePreferences(userId);

    return isNotificationTypeEnabled(
      {
        tripNotifications: preferences.tripNotifications,
        maintenanceNotifications: preferences.maintenanceNotifications,
        inspectionNotifications: preferences.inspectionNotifications,
        fuelNotifications: preferences.fuelNotifications,
        systemNotifications: preferences.systemNotifications,
      },
      type,
    );
  }

  async ensurePreferences(userId: string) {
    const existing = await this.notificationPreferenceRepository.findByUserId(userId);

    if (existing) {
      return existing;
    }

    return this.notificationPreferenceRepository.createDefaults(userId);
  }
}

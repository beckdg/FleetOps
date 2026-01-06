import { Module } from '@nestjs/common';

import { FleetModule } from '../fleet/fleet.module';
import { UsersModule } from '../users/users.module';
import { NotificationEventService } from './notification-events.service';
import { NotificationPreferenceRepository } from './notification-preferences.repository';
import { NotificationPreferenceService } from './notification-preferences.service';
import { NotificationRepository } from './notifications.repository';
import { NotificationService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [UsersModule, FleetModule],
  controllers: [NotificationsController],
  providers: [
    NotificationRepository,
    NotificationPreferenceRepository,
    NotificationService,
    NotificationPreferenceService,
    NotificationEventService,
  ],
  exports: [NotificationService, NotificationPreferenceService, NotificationEventService],
})
export class NotificationsModule {}

import { BullModule } from '@nestjs/bullmq';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { EnvironmentVariables } from '../shared/constants/env.validation';
import { FleetModule } from '../fleet/fleet.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { MaintenanceModule } from '../maintenance/maintenance.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { ReportsModule } from '../reports/reports.module';
import { RolesModule } from '../roles/roles.module';
import { QUEUE_NAMES } from './constants/queue.constants';
import { JobsController } from './jobs.controller';
import { JobRepository } from './jobs.repository';
import { JobService } from './jobs.service';
import { MaintenanceReminderQueueService } from './maintenance-reminder-queue.service';
import { NotificationQueueService } from './notification-queue.service';
import { MaintenanceRemindersProcessor } from './processors/maintenance-reminders.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { ReportGenerationProcessor } from './processors/report-generation.processor';
import { WebhookDeliveryProcessor } from './processors/webhook-delivery.processor';
import { QueueHealthService } from './queue-health.service';
import { ReminderGenerationService } from './reminder-generation.service';
import { ReportGenerationQueueService } from './report-generation-queue.service';
import { DailyReminderScheduler } from './schedulers/daily-reminder.scheduler';
import { WebhookDeliveryQueueService } from './webhook-delivery-queue.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => ({
        connection: {
          url: configService.get('REDIS_URL', { infer: true }),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.WEBHOOK_DELIVERY },
      { name: QUEUE_NAMES.NOTIFICATIONS },
      { name: QUEUE_NAMES.MAINTENANCE_REMINDERS },
      { name: QUEUE_NAMES.REPORT_GENERATION },
    ),
    OrganizationsModule,
    FleetModule,
    RolesModule,
    forwardRef(() => IntegrationsModule),
    NotificationsModule,
    MaintenanceModule,
    ReportsModule,
  ],
  controllers: [JobsController],
  providers: [
    JobRepository,
    JobService,
    WebhookDeliveryQueueService,
    NotificationQueueService,
    MaintenanceReminderQueueService,
    ReportGenerationQueueService,
    QueueHealthService,
    ReminderGenerationService,
    DailyReminderScheduler,
    WebhookDeliveryProcessor,
    NotificationsProcessor,
    MaintenanceRemindersProcessor,
    ReportGenerationProcessor,
  ],
  exports: [
    JobService,
    WebhookDeliveryQueueService,
    NotificationQueueService,
    MaintenanceReminderQueueService,
    ReportGenerationQueueService,
    ReminderGenerationService,
  ],
})
export class QueueModule {}

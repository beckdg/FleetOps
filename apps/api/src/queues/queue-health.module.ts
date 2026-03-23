import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { EnvironmentVariables } from '../shared/constants/env.validation';
import { QUEUE_NAMES } from './constants/queue.constants';
import { QueueHealthService } from './queue-health.service';

@Module({
  imports: [
    ConfigModule,
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
  ],
  providers: [QueueHealthService],
  exports: [QueueHealthService],
})
export class QueueHealthModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from '../database/database.module';
import { QueueHealthModule } from '../queues/queue-health.module';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RedisHealthService } from './redis-health.service';

@Module({
  imports: [DatabaseModule, ConfigModule, QueueHealthModule],
  controllers: [HealthController],
  providers: [HealthService, RedisHealthService],
  exports: [HealthService],
})
export class HealthModule {}

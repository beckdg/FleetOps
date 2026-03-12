import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HealthCheckResponse } from '@fleetops/shared-types';

import { PrismaService } from '../database/prisma.service';
import { QueueHealthService } from '../queues/queue-health.service';
import { APP_NAME } from '../shared/constants/app.constants';
import { EnvironmentVariables } from '../shared/constants/env.validation';
import { RedisHealthService } from './redis-health.service';

const APPLICATION_STARTED_AT = Date.now();

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redisHealthService: RedisHealthService,
    private readonly queueHealthService: QueueHealthService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async getHealth(): Promise<HealthCheckResponse> {
    const [database, redis, queues] = await Promise.all([
      this.checkDatabase(),
      this.redisHealthService.ping(),
      this.queueHealthService.getHealth(),
    ]);

    const queueHealthy = queues.queues.every((queue) => queue.isHealthy);
    const isHealthy = database.connected && redis.connected && queueHealthy;

    return {
      status: isHealthy ? 'ok' : 'degraded',
      service: APP_NAME,
      version: this.configService.get('APP_VERSION', { infer: true }),
      uptimeSeconds: Math.floor((Date.now() - APPLICATION_STARTED_AT) / 1000),
      checks: {
        database,
        redis,
        queues,
      },
    };
  }

  private async checkDatabase(): Promise<{
    connected: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        connected: true,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Database ping failed',
      };
    }
  }
}

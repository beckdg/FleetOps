import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { EnvironmentVariables } from '../shared/constants/env.validation';

export interface RedisHealthCheck {
  connected: boolean;
  latencyMs?: number;
  error?: string;
}

@Injectable()
export class RedisHealthService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor(private readonly configService: ConfigService<EnvironmentVariables, true>) {
    this.client = new Redis(this.configService.get('REDIS_URL', { infer: true }), {
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
      lazyConnect: true,
    });
  }

  async ping(): Promise<RedisHealthCheck> {
    const startedAt = Date.now();

    try {
      await this.client.connect();
      await this.client.ping();

      return {
        connected: true,
        latencyMs: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Redis ping failed',
      };
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.client.disconnect();
  }
}

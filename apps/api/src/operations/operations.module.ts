import { MiddlewareConsumer, Module, NestModule, OnModuleInit, forwardRef } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { QueueModule } from '../queues/queue.module';
import { EnvironmentVariables } from '../shared/constants/env.validation';
import { AllExceptionsFilter } from '../shared/filters/all-exceptions.filter';
import { LoggingInterceptor } from '../shared/interceptors/logging.interceptor';
import { AuditEventStore } from './audit/audit-event.store';
import { AuditStoreModule } from './audit/audit-store.module';
import { AuditController } from './controllers/audit.controller';
import { MetricsController } from './controllers/metrics.controller';
import {
  shouldSkipApiKeyThrottle,
  shouldSkipAuthThrottle,
  shouldSkipWebhookThrottle,
  THROTTLE_PROFILES,
} from './constants/operations.constants';
import { DataCleanupScheduler } from './cleanup/data-cleanup.scheduler';
import { DataCleanupService } from './cleanup/data-cleanup.service';
import { MetricsModule } from './metrics/metrics.module';
import { RequestContextModule } from './request-context/request-context.module';
import { RequestIdMiddleware } from './request-context/request-id.middleware';
import { IpThrottlerGuard } from './rate-limit/ip-throttler.guard';

@Module({
  imports: [
    ConfigModule,
    RequestContextModule,
    AuditStoreModule,
    MetricsModule,
    AuthorizationModule,
    AuthModule,
    forwardRef(() => IntegrationsModule),
    forwardRef(() => QueueModule),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) => ({
        throttlers: [
          {
            name: THROTTLE_PROFILES.AUTH,
            ttl: configService.get('RATE_LIMIT_AUTH_TTL_MS', { infer: true }),
            limit: configService.get('RATE_LIMIT_AUTH_LIMIT', { infer: true }),
            skipIf: shouldSkipAuthThrottle,
          },
          {
            name: THROTTLE_PROFILES.API_KEY,
            ttl: configService.get('RATE_LIMIT_API_KEY_TTL_MS', { infer: true }),
            limit: configService.get('RATE_LIMIT_API_KEY_LIMIT', { infer: true }),
            skipIf: shouldSkipApiKeyThrottle,
          },
          {
            name: THROTTLE_PROFILES.WEBHOOK,
            ttl: configService.get('RATE_LIMIT_WEBHOOK_TTL_MS', { infer: true }),
            limit: configService.get('RATE_LIMIT_WEBHOOK_LIMIT', { infer: true }),
            skipIf: shouldSkipWebhookThrottle,
          },
        ],
      }),
    }),
  ],
  controllers: [AuditController, MetricsController],
  providers: [
    DataCleanupService,
    DataCleanupScheduler,
    IpThrottlerGuard,
    {
      provide: APP_GUARD,
      useClass: IpThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
  ],
  exports: [RequestContextModule, AuditStoreModule, MetricsModule],
})
export class OperationsModule implements NestModule, OnModuleInit {
  constructor(
    private readonly auditEventStore: AuditEventStore,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }

  onModuleInit(): void {
    this.auditEventStore.configure(this.configService.get('AUDIT_BUFFER_SIZE', { infer: true }));
  }
}

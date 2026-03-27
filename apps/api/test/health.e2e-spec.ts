import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { PrismaService } from '../src/database/prisma.service';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';
import { RedisHealthService } from '../src/health/redis-health.service';
import { QueueHealthService } from '../src/queues/queue-health.service';
import { configureApp } from '../src/shared/bootstrap/configure-app';
import { API_GLOBAL_PREFIX } from '../src/shared/constants/app.constants';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ APP_VERSION: '0.1.0' })],
        }),
      ],
      controllers: [HealthController],
      providers: [
        HealthService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
          },
        },
        {
          provide: RedisHealthService,
          useValue: {
            ping: jest.fn().mockResolvedValue({ connected: true, latencyMs: 1 }),
          },
        },
        {
          provide: QueueHealthService,
          useValue: {
            getHealth: jest.fn().mockResolvedValue({
              checkedAt: new Date().toISOString(),
              queues: [],
            }),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns service status', async () => {
    const response = await request(app.getHttpServer())
      .get(`/${API_GLOBAL_PREFIX}/health`)
      .expect(200);

    expect(response.body.status).toBe('ok');
    expect(response.body.service).toBe('fleetops-api');
    expect(response.body.version).toBe('0.1.0');
    expect(response.body.checks.database.connected).toBe(true);
    expect(response.body.checks.redis.connected).toBe(true);
  });
});

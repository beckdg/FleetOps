import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../database/prisma.service';
import { QueueHealthService } from '../queues/queue-health.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { RedisHealthService } from './redis-health.service';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('0.1.0'),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return health check response', async () => {
    const result = await controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('fleetops-api');
    expect(result.version).toBe('0.1.0');
    expect(result.checks.database.connected).toBe(true);
  });
});

import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

import { runSeeders } from './seeds';
import { SeedLogger } from './seeds/types';

config({ path: resolve(__dirname, '../.env') });

async function verifyDatabaseConnection(prisma: PrismaClient, logger: SeedLogger): Promise<void> {
  await prisma.$connect();
  await prisma.$queryRaw`SELECT 1`;
  logger.info('Database connection verified');
}

async function main(): Promise<void> {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });
  const logger = new SeedLogger();

  logger.info('Starting FleetOps database seed');

  try {
    await verifyDatabaseConnection(prisma, logger);
    await runSeeders({ prisma, logger });
    logger.info('FleetOps database seed completed successfully');
  } catch (error) {
    logger.error('FleetOps database seed failed', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();

import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';

async function recreatePublicSchema(databaseUrl: string): Promise<void> {
  const prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });

  try {
    await prisma.$executeRawUnsafe('DROP SCHEMA IF EXISTS public CASCADE');
    await prisma.$executeRawUnsafe('CREATE SCHEMA public');
    await prisma.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO public');
  } finally {
    await prisma.$disconnect();
  }
}

export default async function globalSetup(): Promise<void> {
  config({ path: resolve(__dirname, '../../.env') });

  if (process.env.DATABASE_URL_TEST) {
    process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  } else if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL =
      'postgresql://fleetops:fleetops@localhost:5433/fleetops_test?schema=public';
  }

  await recreatePublicSchema(process.env.DATABASE_URL);

  const apiRoot = resolve(__dirname, '../..');

  execSync('pnpm exec prisma migrate deploy', {
    cwd: apiRoot,
    stdio: 'inherit',
    env: process.env,
  });
}

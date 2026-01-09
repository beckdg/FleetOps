import { PrismaClient } from '@prisma/client';

const TABLES = [
  'notifications',
  'notification_preferences',
  'fuel_records',
  'fuel_stations',
  'maintenance_events',
  'maintenance_records',
  'inspections',
  'trip_events',
  'trips',
  'vehicle_assignments',
  'vehicles',
  'drivers',
  'refresh_tokens',
  'user_roles',
  'role_permissions',
  'users',
  'roles',
  'permissions',
  'organizations',
] as const;

export async function resetDatabase(prisma: PrismaClient): Promise<void> {
  const tableList = TABLES.join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);
}

export async function migrateDatabase(): Promise<void> {
  const { execSync } = await import('child_process');
  execSync('pnpm exec prisma migrate deploy', {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
}

import type { Seeder } from './types';

/**
 * Ordered list of database seeders.
 *
 * Register new seeders here as domain modules are implemented.
 * Seeders run sequentially in the order defined below.
 *
 * Planned seeders:
 * - roles          RBAC roles and permissions
 * - users          Admin and demo users
 * - vehicles       Fleet vehicle records
 * - drivers        Driver profiles
 * - trips          Sample trip data
 * - maintenance    Maintenance schedules and records
 * - fuel           Fuel purchase records
 * - inspections    Vehicle inspection records
 * - notifications  Notification templates
 * - api-keys       Service API keys (non-production only)
 * - webhooks       Webhook endpoint fixtures
 */
export const seeders: Seeder[] = [
  // Example (uncomment when Role model exists):
  // { name: 'roles', run: seedRoles },
];

export async function runSeeders(context: import('./types').SeedContext): Promise<void> {
  if (seeders.length === 0) {
    context.logger.info('No seeders registered — schema has no models yet');
    return;
  }

  for (const seeder of seeders) {
    context.logger.info(`Running seeder: ${seeder.name}`);
    await seeder.run(context);
    context.logger.info(`Completed seeder: ${seeder.name}`);
  }
}

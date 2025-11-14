import type { Seeder } from './types';
import { seedDrivers } from './drivers.seed';
import { seedOrganizations } from './organizations.seed';
import { seedPermissions } from './permissions.seed';
import { seedRolePermissions } from './role-permissions.seed';
import { seedRoles } from './roles.seed';
import { seedVehicles } from './vehicles.seed';

/**
 * Ordered list of database seeders.
 *
 * Seed order matters for multi-tenant identity data:
 * 1. organizations
 * 2. permissions (global)
 * 3. roles (org-scoped)
 * 4. role-permissions (admin gets all permissions)
 * 5. vehicles (org-scoped demo fleet)
 * 6. drivers (org-scoped demo drivers)
 */
export const seeders: Seeder[] = [
  { name: 'organizations', run: seedOrganizations },
  { name: 'permissions', run: seedPermissions },
  { name: 'roles', run: seedRoles },
  { name: 'role-permissions', run: seedRolePermissions },
  { name: 'vehicles', run: seedVehicles },
  { name: 'drivers', run: seedDrivers },
];

export async function runSeeders(context: import('./types').SeedContext): Promise<void> {
  for (const seeder of seeders) {
    context.logger.info(`Running seeder: ${seeder.name}`);
    await seeder.run(context);
    context.logger.info(`Completed seeder: ${seeder.name}`);
  }
}

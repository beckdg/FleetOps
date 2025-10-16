import type { Seeder } from './types';
import { seedOrganizations } from './organizations.seed';
import { seedPermissions } from './permissions.seed';
import { seedRolePermissions } from './role-permissions.seed';
import { seedRoles } from './roles.seed';

/**
 * Ordered list of database seeders.
 *
 * Seed order matters for multi-tenant identity data:
 * 1. organizations
 * 2. permissions (global)
 * 3. roles (org-scoped)
 * 4. role-permissions (admin gets all permissions)
 */
export const seeders: Seeder[] = [
  { name: 'organizations', run: seedOrganizations },
  { name: 'permissions', run: seedPermissions },
  { name: 'roles', run: seedRoles },
  { name: 'role-permissions', run: seedRolePermissions },
];

export async function runSeeders(context: import('./types').SeedContext): Promise<void> {
  for (const seeder of seeders) {
    context.logger.info(`Running seeder: ${seeder.name}`);
    await seeder.run(context);
    context.logger.info(`Completed seeder: ${seeder.name}`);
  }
}

import type { Seeder } from './types';
import { seedDemoFleetSetup } from './demo-fleet-setup.seed';
import { seedDrivers } from './drivers.seed';
import { seedFuel } from './fuel.seed';
import { seedInspections } from './inspections.seed';
import { seedIntegrations } from './integrations.seed';
import { seedMaintenanceRecords } from './maintenance.seed';
import { seedReminderDemoData } from './reminder-demo.seed';
import { seedNotificationPreferences, seedNotifications } from './notifications.seed';
import { seedOrganizations } from './organizations.seed';
import { seedPermissions } from './permissions.seed';
import { seedRolePermissions } from './role-permissions.seed';
import { seedRoles } from './roles.seed';
import { seedTrips } from './trips.seed';
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
 * 7. demo fleet setup (dispatcher user + assignments)
 * 8. trips (demo operational trips)
 * 9. maintenance records
 * 10. inspections
 * 11. fuel stations and records
 * 12. notification preferences
 * 13. notifications
 * 14. integrations (API keys and webhooks)
 * 15. reminder demo data (expiring license + upcoming maintenance)
 */
export const seeders: Seeder[] = [
  { name: 'organizations', run: seedOrganizations },
  { name: 'permissions', run: seedPermissions },
  { name: 'roles', run: seedRoles },
  { name: 'role-permissions', run: seedRolePermissions },
  { name: 'vehicles', run: seedVehicles },
  { name: 'drivers', run: seedDrivers },
  { name: 'demo-fleet-setup', run: seedDemoFleetSetup },
  { name: 'trips', run: seedTrips },
  { name: 'maintenance', run: seedMaintenanceRecords },
  { name: 'inspections', run: seedInspections },
  { name: 'fuel', run: seedFuel },
  { name: 'notification-preferences', run: seedNotificationPreferences },
  { name: 'notifications', run: seedNotifications },
  { name: 'integrations', run: seedIntegrations },
  { name: 'reminder-demo', run: seedReminderDemoData },
];

export async function runSeeders(context: import('./types').SeedContext): Promise<void> {
  for (const seeder of seeders) {
    context.logger.info(`Running seeder: ${seeder.name}`);
    await seeder.run(context);
    context.logger.info(`Completed seeder: ${seeder.name}`);
  }
}

import type { SeedContext } from './types';
import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';

export const DEFAULT_ROLES = [
  { name: 'admin', description: 'Full organization administrator' },
  { name: 'fleet_manager', description: 'Manages fleet operations' },
  { name: 'dispatcher', description: 'Assigns trips and coordinates drivers' },
  { name: 'mechanic', description: 'Maintains vehicles' },
  { name: 'driver', description: 'Operates assigned vehicles' },
] as const;

export async function seedRoles(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    throw new Error(`Organization "${DEMO_ORGANIZATION_SLUG}" must exist before seeding roles`);
  }

  for (const role of DEFAULT_ROLES) {
    await context.prisma.role.upsert({
      where: {
        organizationId_name: {
          organizationId: organization.id,
          name: role.name,
        },
      },
      update: {
        description: role.description,
      },
      create: {
        organizationId: organization.id,
        name: role.name,
        description: role.description,
      },
    });
  }

  context.logger.info(
    `Ensured ${DEFAULT_ROLES.length} default roles for "${DEMO_ORGANIZATION_SLUG}"`,
  );
}

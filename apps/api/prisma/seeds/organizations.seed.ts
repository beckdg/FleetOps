import type { SeedContext } from './types';

export const DEMO_ORGANIZATION_SLUG = 'fleetops-demo';

export async function seedOrganizations(context: SeedContext): Promise<void> {
  const existing = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (existing) {
    context.logger.info(`Organization "${DEMO_ORGANIZATION_SLUG}" already exists — skipping`);
    return;
  }

  await context.prisma.organization.create({
    data: {
      name: 'FleetOps Demo',
      slug: DEMO_ORGANIZATION_SLUG,
      isActive: true,
    },
  });

  context.logger.info(`Created organization "${DEMO_ORGANIZATION_SLUG}"`);
}

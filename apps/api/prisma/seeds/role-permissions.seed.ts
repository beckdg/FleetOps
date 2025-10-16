import type { SeedContext } from './types';
import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';

export async function seedRolePermissions(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    throw new Error(
      `Organization "${DEMO_ORGANIZATION_SLUG}" must exist before seeding role permissions`,
    );
  }

  const adminRole = await context.prisma.role.findUnique({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'admin',
      },
    },
  });

  if (!adminRole) {
    throw new Error('Admin role must exist before seeding role permissions');
  }

  const permissions = await context.prisma.permission.findMany();

  for (const permission of permissions) {
    await context.prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  context.logger.info(`Assigned ${permissions.length} permissions to admin role`);
}

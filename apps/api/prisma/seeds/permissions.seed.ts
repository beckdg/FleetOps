import type { SeedContext } from './types';

export const DEFAULT_PERMISSIONS = [
  { resource: 'users', action: 'read', description: 'Read users' },
  { resource: 'users', action: 'write', description: 'Create and update users' },
  { resource: 'vehicles', action: 'read', description: 'Read vehicles' },
  { resource: 'vehicles', action: 'write', description: 'Create and update vehicles' },
  { resource: 'drivers', action: 'read', description: 'Read drivers' },
  { resource: 'drivers', action: 'write', description: 'Create and update drivers' },
  { resource: 'trips', action: 'read', description: 'Read trips' },
  { resource: 'trips', action: 'write', description: 'Create and update trips' },
  { resource: 'maintenance', action: 'read', description: 'Read maintenance records' },
  {
    resource: 'maintenance',
    action: 'write',
    description: 'Create and update maintenance records',
  },
  { resource: 'fuel', action: 'read', description: 'Read fuel records and analytics' },
  { resource: 'fuel', action: 'write', description: 'Create fuel records and stations' },
  { resource: 'notifications', action: 'read', description: 'Read notifications and preferences' },
  {
    resource: 'notifications',
    action: 'write',
    description: 'Update notification read state and preferences',
  },
  { resource: 'reports', action: 'read', description: 'Read operational reports and analytics' },
] as const;

export async function seedPermissions(context: SeedContext): Promise<void> {
  for (const permission of DEFAULT_PERMISSIONS) {
    await context.prisma.permission.upsert({
      where: {
        resource_action: {
          resource: permission.resource,
          action: permission.action,
        },
      },
      update: {
        description: permission.description,
      },
      create: permission,
    });
  }

  context.logger.info(`Ensured ${DEFAULT_PERMISSIONS.length} default permissions`);
}

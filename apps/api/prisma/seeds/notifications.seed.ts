import { NotificationType } from '@prisma/client';

import { DEMO_DISPATCHER_EMAIL } from './demo-fleet-setup.seed';
import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';
import type { SeedContext } from './types';

const DEMO_NOTIFICATIONS = [
  {
    id: 'c3000000-0000-4000-8000-000000000001',
    type: NotificationType.TRIP_STARTED,
    title: 'Trip started',
    message: 'Trip TRIP-DEMO-003 is now in progress.',
    metadata: { tripNumber: 'TRIP-DEMO-003' },
    readAt: null as Date | null,
  },
  {
    id: 'c3000000-0000-4000-8000-000000000002',
    type: NotificationType.INSPECTION_FAILED,
    title: 'Inspection failed',
    message: 'Vehicle inspection by Safety Inspector did not pass.',
    metadata: { passed: false },
    readAt: null as Date | null,
  },
  {
    id: 'c3000000-0000-4000-8000-000000000003',
    type: NotificationType.FUEL_RECORD_CREATED,
    title: 'Fuel record created',
    message: 'A fuel purchase of 131.95 was recorded.',
    metadata: { totalCost: '131.95' },
    readAt: new Date('2025-06-15T10:00:00.000Z'),
  },
  {
    id: 'c3000000-0000-4000-8000-000000000004',
    type: NotificationType.SYSTEM,
    title: 'Welcome to FleetOps',
    message: 'Your notification preferences are configured. Alerts will appear here.',
    metadata: { source: 'seed' },
    readAt: null as Date | null,
  },
] as const;

export async function seedNotificationPreferences(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    context.logger.warn('Demo organization not found — skipping notification preference seed');
    return;
  }

  const dispatcher = await context.prisma.user.findUnique({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: DEMO_DISPATCHER_EMAIL,
      },
    },
  });

  if (!dispatcher) {
    context.logger.warn('Demo dispatcher not found — skipping notification preference seed');
    return;
  }

  await context.prisma.notificationPreference.upsert({
    where: { userId: dispatcher.id },
    update: {},
    create: { userId: dispatcher.id },
  });

  context.logger.info('Ensured default notification preferences for demo dispatcher');
}

export async function seedNotifications(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    context.logger.warn('Demo organization not found — skipping notification seed');
    return;
  }

  const dispatcher = await context.prisma.user.findUnique({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: DEMO_DISPATCHER_EMAIL,
      },
    },
  });

  if (!dispatcher) {
    context.logger.warn('Demo dispatcher not found — skipping notification seed');
    return;
  }

  for (const demoNotification of DEMO_NOTIFICATIONS) {
    await context.prisma.notification.upsert({
      where: { id: demoNotification.id },
      update: {
        title: demoNotification.title,
        message: demoNotification.message,
        metadata: demoNotification.metadata,
        readAt: demoNotification.readAt,
      },
      create: {
        id: demoNotification.id,
        organizationId: organization.id,
        userId: dispatcher.id,
        type: demoNotification.type,
        title: demoNotification.title,
        message: demoNotification.message,
        metadata: demoNotification.metadata,
        readAt: demoNotification.readAt,
      },
    });
  }

  context.logger.info(`Ensured ${DEMO_NOTIFICATIONS.length} demo notifications`);
}

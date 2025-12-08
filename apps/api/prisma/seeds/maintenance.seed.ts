import { MaintenanceStatus, MaintenanceType } from '@prisma/client';

import { DEMO_DISPATCHER_EMAIL } from './demo-fleet-setup.seed';
import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';
import type { SeedContext } from './types';

export async function seedMaintenanceRecords(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    context.logger.warn('Demo organization not found — skipping maintenance seed');
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

  const vehicle = await context.prisma.vehicle.findFirst({
    where: { organizationId: organization.id, plateNumber: 'FLT-1003' },
  });

  if (!dispatcher || !vehicle) {
    context.logger.warn('Demo dispatcher or vehicle missing — skipping maintenance seed');
    return;
  }

  await context.prisma.maintenanceRecord.upsert({
    where: {
      id: '00000000-0000-4000-8000-000000000301',
    },
    update: {
      title: 'Brake system repair',
      status: MaintenanceStatus.SCHEDULED,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000301',
      organizationId: organization.id,
      vehicleId: vehicle.id,
      title: 'Brake system repair',
      description: 'Replace front brake pads and inspect rotors',
      maintenanceType: MaintenanceType.CORRECTIVE,
      scheduledAt: new Date('2025-06-18T10:00:00.000Z'),
      estimatedCost: '450.00',
      status: MaintenanceStatus.SCHEDULED,
      createdByUserId: dispatcher.id,
    },
  });

  const vehicleTwo = await context.prisma.vehicle.findFirst({
    where: { organizationId: organization.id, plateNumber: 'FLT-1001' },
  });

  if (vehicleTwo) {
    await context.prisma.maintenanceRecord.upsert({
      where: {
        id: '00000000-0000-4000-8000-000000000302',
      },
      update: {
        title: 'Oil change',
        status: MaintenanceStatus.COMPLETED,
      },
      create: {
        id: '00000000-0000-4000-8000-000000000302',
        organizationId: organization.id,
        vehicleId: vehicleTwo.id,
        title: 'Oil change',
        description: 'Preventive oil and filter change',
        maintenanceType: MaintenanceType.PREVENTIVE,
        scheduledAt: new Date('2025-05-01T09:00:00.000Z'),
        startedAt: new Date('2025-05-01T09:30:00.000Z'),
        completedAt: new Date('2025-05-01T10:15:00.000Z'),
        estimatedCost: '120.00',
        actualCost: '115.00',
        status: MaintenanceStatus.COMPLETED,
        createdByUserId: dispatcher.id,
      },
    });
  }

  context.logger.info('Ensured demo maintenance records');
}

import { DEMO_DISPATCHER_EMAIL } from './demo-fleet-setup.seed';
import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';
import type { SeedContext } from './types';

export async function seedInspections(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    context.logger.warn('Demo organization not found — skipping inspection seed');
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
    where: { organizationId: organization.id, plateNumber: 'FLT-1001' },
  });

  const vehicleFailed = await context.prisma.vehicle.findFirst({
    where: { organizationId: organization.id, plateNumber: 'FLT-1002' },
  });

  if (!dispatcher || !vehicle) {
    context.logger.warn('Demo dispatcher or vehicle missing — skipping inspection seed');
    return;
  }

  await context.prisma.inspection.upsert({
    where: { id: '00000000-0000-4000-8000-000000000401' },
    update: { passed: true },
    create: {
      id: '00000000-0000-4000-8000-000000000401',
      organizationId: organization.id,
      vehicleId: vehicle.id,
      inspectionDate: new Date('2025-05-15'),
      passed: true,
      notes: 'All safety checks passed',
      inspectorName: 'Jordan Lee',
      createdByUserId: dispatcher.id,
    },
  });

  if (vehicleFailed) {
    await context.prisma.inspection.upsert({
      where: { id: '00000000-0000-4000-8000-000000000402' },
      update: { passed: false },
      create: {
        id: '00000000-0000-4000-8000-000000000402',
        organizationId: organization.id,
        vehicleId: vehicleFailed.id,
        inspectionDate: new Date('2025-05-20'),
        passed: false,
        notes: 'Rear tire tread below minimum threshold',
        inspectorName: 'Alex Rivera',
        createdByUserId: dispatcher.id,
      },
    });
  }

  context.logger.info('Ensured demo inspections');
}

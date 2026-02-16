import { DriverStatus, MaintenanceStatus, MaintenanceType } from '@prisma/client';

import { DEMO_DISPATCHER_EMAIL } from './demo-fleet-setup.seed';
import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';
import type { SeedContext } from './types';

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export async function seedReminderDemoData(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    context.logger.warn('Demo organization not found — skipping reminder demo seed');
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
    where: { organizationId: organization.id, plateNumber: 'FLT-1002' },
  });

  if (!dispatcher || !vehicle) {
    context.logger.warn('Demo dispatcher or vehicle missing — skipping reminder demo seed');
    return;
  }

  const expiringLicenseDate = addDays(new Date(), 20);

  await context.prisma.driver.upsert({
    where: {
      organizationId_employeeId: {
        organizationId: organization.id,
        employeeId: 'DRV-REM-001',
      },
    },
    update: {
      licenseExpiryDate: expiringLicenseDate,
      status: DriverStatus.ACTIVE,
    },
    create: {
      organizationId: organization.id,
      employeeId: 'DRV-REM-001',
      firstName: 'Remy',
      lastName: 'Expiring',
      licenseNumber: 'REM123456',
      licenseExpiryDate: expiringLicenseDate,
      status: DriverStatus.ACTIVE,
    },
  });

  const upcomingMaintenanceDate = addDays(new Date(), 5);

  await context.prisma.maintenanceRecord.upsert({
    where: { id: '00000000-0000-4000-8000-000000000401' },
    update: {
      scheduledAt: upcomingMaintenanceDate,
      status: MaintenanceStatus.SCHEDULED,
    },
    create: {
      id: '00000000-0000-4000-8000-000000000401',
      organizationId: organization.id,
      vehicleId: vehicle.id,
      title: 'Upcoming tire rotation',
      description: 'Scheduled reminder demo maintenance',
      maintenanceType: MaintenanceType.PREVENTIVE,
      scheduledAt: upcomingMaintenanceDate,
      estimatedCost: '95.00',
      status: MaintenanceStatus.SCHEDULED,
      createdByUserId: dispatcher.id,
    },
  });

  context.logger.info('Seeded reminder demo driver and maintenance record');
}

import { DriverStatus } from '@prisma/client';

import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';
import type { SeedContext } from './types';

export const DEMO_DRIVERS = [
  {
    employeeId: 'DRV-001',
    firstName: 'Alex',
    lastName: 'Rivera',
    licenseNumber: 'RVR123456',
    licenseExpiryDate: new Date('2027-06-30'),
    status: DriverStatus.ACTIVE,
  },
  {
    employeeId: 'DRV-002',
    firstName: 'Jordan',
    lastName: 'Lee',
    licenseNumber: 'LEE654321',
    licenseExpiryDate: new Date('2026-11-15'),
    status: DriverStatus.ACTIVE,
  },
  {
    employeeId: 'DRV-003',
    firstName: 'Taylor',
    lastName: 'Nguyen',
    licenseNumber: 'NGY789012',
    licenseExpiryDate: new Date('2028-03-01'),
    status: DriverStatus.SUSPENDED,
  },
  {
    employeeId: 'DRV-004',
    firstName: 'Casey',
    lastName: 'Brooks',
    licenseNumber: 'BRK345678',
    licenseExpiryDate: new Date('2025-09-20'),
    status: DriverStatus.INACTIVE,
  },
  {
    employeeId: 'DRV-005',
    firstName: 'Morgan',
    lastName: 'Patel',
    licenseNumber: 'PTL901234',
    licenseExpiryDate: new Date('2027-01-10'),
    status: DriverStatus.ACTIVE,
  },
] as const;

export async function seedDrivers(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    context.logger.warn('Demo organization not found — skipping driver seed');
    return;
  }

  for (const driver of DEMO_DRIVERS) {
    await context.prisma.driver.upsert({
      where: {
        organizationId_employeeId: {
          organizationId: organization.id,
          employeeId: driver.employeeId,
        },
      },
      update: {
        firstName: driver.firstName,
        lastName: driver.lastName,
        licenseNumber: driver.licenseNumber,
        licenseExpiryDate: driver.licenseExpiryDate,
        status: driver.status,
      },
      create: {
        organizationId: organization.id,
        employeeId: driver.employeeId,
        firstName: driver.firstName,
        lastName: driver.lastName,
        licenseNumber: driver.licenseNumber,
        licenseExpiryDate: driver.licenseExpiryDate,
        status: driver.status,
      },
    });
  }

  context.logger.info(
    `Ensured ${DEMO_DRIVERS.length} demo drivers for "${DEMO_ORGANIZATION_SLUG}"`,
  );
}

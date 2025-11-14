import { VehicleStatus } from '@prisma/client';

import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';
import type { SeedContext } from './types';

export const DEMO_VEHICLES = [
  {
    plateNumber: 'FLT-1001',
    vin: '1FTBR1C85PKA10001',
    make: 'Ford',
    model: 'Transit',
    year: 2022,
    status: VehicleStatus.ACTIVE,
  },
  {
    plateNumber: 'FLT-1002',
    vin: '1FTBR1C85PKA10002',
    make: 'Mercedes-Benz',
    model: 'Sprinter',
    year: 2021,
    status: VehicleStatus.ACTIVE,
  },
  {
    plateNumber: 'FLT-1003',
    vin: '1FTBR1C85PKA10003',
    make: 'Ram',
    model: 'ProMaster',
    year: 2020,
    status: VehicleStatus.IN_MAINTENANCE,
  },
  {
    plateNumber: 'FLT-1004',
    vin: '1FTBR1C85PKA10004',
    make: 'Chevrolet',
    model: 'Express',
    year: 2019,
    status: VehicleStatus.OUT_OF_SERVICE,
  },
  {
    plateNumber: 'FLT-1005',
    vin: '1FTBR1C85PKA10005',
    make: 'Ford',
    model: 'E-350',
    year: 2018,
    status: VehicleStatus.RETIRED,
  },
] as const;

export async function seedVehicles(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    context.logger.warn('Demo organization not found — skipping vehicle seed');
    return;
  }

  for (const vehicle of DEMO_VEHICLES) {
    await context.prisma.vehicle.upsert({
      where: { vin: vehicle.vin },
      update: {
        plateNumber: vehicle.plateNumber,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        status: vehicle.status,
      },
      create: {
        organizationId: organization.id,
        plateNumber: vehicle.plateNumber,
        vin: vehicle.vin,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        status: vehicle.status,
      },
    });
  }

  context.logger.info(
    `Ensured ${DEMO_VEHICLES.length} demo vehicles for "${DEMO_ORGANIZATION_SLUG}"`,
  );
}

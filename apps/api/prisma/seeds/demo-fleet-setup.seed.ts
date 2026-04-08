import * as bcrypt from 'bcrypt';

import { DEMO_ORGANIZATION_SLUG } from './organizations.seed';
import type { SeedContext } from './types';

export const DEMO_DISPATCHER_EMAIL = 'dispatcher@fleetops-demo.test';
export const DEMO_ADMIN_EMAIL = 'admin@fleetops-demo.test';
export const DEMO_USER_PASSWORD = 'DemoPassword123!';

export async function seedDemoFleetSetup(context: SeedContext): Promise<void> {
  const organization = await context.prisma.organization.findUnique({
    where: { slug: DEMO_ORGANIZATION_SLUG },
  });

  if (!organization) {
    context.logger.warn('Demo organization not found — skipping demo fleet setup');
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_USER_PASSWORD, 12);

  const admin = await context.prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: DEMO_ADMIN_EMAIL,
      },
    },
    update: {
      firstName: 'Demo',
      lastName: 'Admin',
      isActive: true,
      passwordHash,
    },
    create: {
      organizationId: organization.id,
      email: DEMO_ADMIN_EMAIL,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Admin',
    },
  });

  const adminRole = await context.prisma.role.findUnique({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: 'admin',
      },
    },
  });

  if (!adminRole) {
    context.logger.warn('Admin role not found — skipping demo admin assignment');
  } else {
    await context.prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: admin.id,
          roleId: adminRole.id,
        },
      },
      update: {},
      create: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    });
  }

  const dispatcher = await context.prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: DEMO_DISPATCHER_EMAIL,
      },
    },
    update: {
      firstName: 'Demo',
      lastName: 'Dispatcher',
      isActive: true,
    },
    create: {
      organizationId: organization.id,
      email: DEMO_DISPATCHER_EMAIL,
      passwordHash,
      firstName: 'Demo',
      lastName: 'Dispatcher',
    },
  });

  const vehicle = await context.prisma.vehicle.findFirst({
    where: { organizationId: organization.id, plateNumber: 'FLT-1001' },
  });

  const driver = await context.prisma.driver.findFirst({
    where: { organizationId: organization.id, employeeId: 'DRV-001' },
  });

  if (!vehicle || !driver) {
    context.logger.warn('Demo vehicle or driver not found — skipping demo assignments');
    return;
  }

  const existingAssignment = await context.prisma.vehicleAssignment.findFirst({
    where: {
      vehicleId: vehicle.id,
      driverId: driver.id,
      endedAt: null,
    },
  });

  if (!existingAssignment) {
    await context.prisma.vehicleAssignment.create({
      data: {
        organizationId: organization.id,
        vehicleId: vehicle.id,
        driverId: driver.id,
        assignedByUserId: dispatcher.id,
      },
    });
  }

  const vehicleTwo = await context.prisma.vehicle.findFirst({
    where: { organizationId: organization.id, plateNumber: 'FLT-1002' },
  });

  const driverTwo = await context.prisma.driver.findFirst({
    where: { organizationId: organization.id, employeeId: 'DRV-002' },
  });

  if (vehicleTwo && driverTwo) {
    const existingAssignmentTwo = await context.prisma.vehicleAssignment.findFirst({
      where: {
        vehicleId: vehicleTwo.id,
        driverId: driverTwo.id,
        endedAt: null,
      },
    });

    if (!existingAssignmentTwo) {
      await context.prisma.vehicleAssignment.create({
        data: {
          organizationId: organization.id,
          vehicleId: vehicleTwo.id,
          driverId: driverTwo.id,
          assignedByUserId: dispatcher.id,
        },
      });
    }
  }

  context.logger.info(`Ensured demo fleet assignments for "${DEMO_ORGANIZATION_SLUG}"`);
}

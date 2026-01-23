import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { InspectionService } from '../../src/inspections/inspections.service';
import { OrganizationService } from '../../src/organizations/organizations.service';
import { PrismaService } from '../../src/database/prisma.service';
import { UserService } from '../../src/users/users.service';
import { VehicleService } from '../../src/vehicles/vehicles.service';
import { InspectionsTestModule } from './inspections-test.module';
import { resetDatabase } from './helpers/database.helper';

describe('Inspections domain (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let userService: UserService;
  let vehicleService: VehicleService;
  let inspectionService: InspectionService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [InspectionsTestModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    userService = moduleRef.get(UserService);
    vehicleService = moduleRef.get(VehicleService);
    inspectionService = moduleRef.get(InspectionService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleRef.close();
  });

  async function seedOrganizationContext(slug: string) {
    const organization = await organizationService.createOrganization({
      name: `${slug} Org`,
      slug,
    });

    const actor = await userService.createUser({
      organizationId: organization.id,
      email: `inspector@${slug}.test`,
      password: 'StrongPassword123!',
      firstName: 'Fleet',
      lastName: 'Inspector',
    });

    const vehicle = await vehicleService.createVehicle({
      organizationId: organization.id,
      plateNumber: `${slug.toUpperCase()}-001`,
      vin: `1INSP${slug.padStart(12, '0').slice(-12)}`,
      make: 'Ford',
      model: 'Transit',
      year: 2022,
    });

    return { organization, actor, vehicle };
  }

  it('records a passed inspection', async () => {
    const { organization, actor, vehicle } = await seedOrganizationContext('passed-inspection');

    const inspection = await inspectionService.createInspection({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      inspectionDate: '2025-06-01',
      passed: true,
      notes: 'All systems nominal',
      inspectorName: 'Alex Rivera',
      createdByUserId: actor.id,
    });

    expect(inspection.passed).toBe(true);
    expect(inspection.vehicleId).toBe(vehicle.id);
    expect(inspection.organizationId).toBe(organization.id);
    expect(inspection.inspectorName).toBe('Alex Rivera');

    const persisted = await prisma.inspection.findUnique({ where: { id: inspection.id } });
    expect(persisted?.passed).toBe(true);

    const listed = await inspectionService.findByOrganization(organization.id);
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(inspection.id);
  });

  it('records a failed inspection', async () => {
    const { organization, actor, vehicle } = await seedOrganizationContext('failed-inspection');

    const inspection = await inspectionService.createInspection({
      organizationId: organization.id,
      vehicleId: vehicle.id,
      inspectionDate: '2025-06-02',
      passed: false,
      notes: 'Brake lights not functioning',
      inspectorName: 'Safety Inspector',
      createdByUserId: actor.id,
    });

    expect(inspection.passed).toBe(false);
    expect(inspection.notes).toBe('Brake lights not functioning');

    const persisted = await prisma.inspection.findUnique({ where: { id: inspection.id } });
    expect(persisted?.passed).toBe(false);
  });

  it('rejects cross-organization inspection creation', async () => {
    const orgA = await seedOrganizationContext('inspection-org-a');
    const orgB = await seedOrganizationContext('inspection-org-b');

    await expect(
      inspectionService.createInspection({
        organizationId: orgA.organization.id,
        vehicleId: orgB.vehicle.id,
        inspectionDate: '2025-06-03',
        passed: true,
        inspectorName: 'Cross Org Inspector',
        createdByUserId: orgA.actor.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const orgAInspections = await inspectionService.findByOrganization(orgA.organization.id);
    const orgBInspections = await inspectionService.findByOrganization(orgB.organization.id);

    expect(orgAInspections).toHaveLength(0);
    expect(orgBInspections).toHaveLength(0);
  });

  it('rejects inspection creation for an invalid vehicle', async () => {
    const { organization, actor } = await seedOrganizationContext('invalid-vehicle');
    const missingVehicleId = '00000000-0000-4000-8000-000000000099';

    await expect(
      inspectionService.createInspection({
        organizationId: organization.id,
        vehicleId: missingVehicleId,
        inspectionDate: '2025-06-04',
        passed: true,
        inspectorName: 'Invalid Vehicle Inspector',
        createdByUserId: actor.id,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const inspections = await inspectionService.findByOrganization(organization.id);
    expect(inspections).toHaveLength(0);
  });
});

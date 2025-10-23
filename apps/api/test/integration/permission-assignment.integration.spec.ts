import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../src/database/prisma.service';
import { PermissionService } from '../../src/permissions/permissions.service';
import { resetDatabase } from './helpers/database.helper';
import { IdentityTestModule } from './identity-test.module';

describe('PermissionService assignments (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let permissionService: PermissionService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [IdentityTestModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    permissionService = moduleRef.get(PermissionService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleRef.close();
  });

  it('assigns and removes a permission from a role', async () => {
    const organization = await prisma.organization.create({
      data: { name: 'Perm Org', slug: 'perm-org', isActive: true },
    });

    const role = await prisma.role.create({
      data: {
        organizationId: organization.id,
        name: 'admin',
      },
    });

    const permission = await permissionService.createPermission({
      resource: 'trips',
      action: 'read',
    });

    await permissionService.assignPermissionToRole(role.id, permission.id);

    const assignment = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: { roleId: role.id, permissionId: permission.id },
      },
    });
    expect(assignment).not.toBeNull();

    await permissionService.removePermissionFromRole(role.id, permission.id);

    const removedAssignment = await prisma.rolePermission.findUnique({
      where: {
        roleId_permissionId: { roleId: role.id, permissionId: permission.id },
      },
    });
    expect(removedAssignment).toBeNull();
  });

  it('prevents duplicate permission assignments', async () => {
    const organization = await prisma.organization.create({
      data: { name: 'Perm Dup Org', slug: 'perm-dup-org', isActive: true },
    });

    const role = await prisma.role.create({
      data: {
        organizationId: organization.id,
        name: 'fleet_manager',
      },
    });

    const permission = await permissionService.createPermission({
      resource: 'vehicles',
      action: 'write',
    });

    await permissionService.assignPermissionToRole(role.id, permission.id);

    await expect(
      permissionService.assignPermissionToRole(role.id, permission.id),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

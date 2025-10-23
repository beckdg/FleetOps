import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../src/database/prisma.service';
import { RoleService } from '../../src/roles/roles.service';
import { resetDatabase } from './helpers/database.helper';
import { IdentityTestModule } from './identity-test.module';

describe('RoleService assignments (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let roleService: RoleService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [IdentityTestModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    roleService = moduleRef.get(RoleService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleRef.close();
  });

  it('assigns and removes a role from a user', async () => {
    const organization = await prisma.organization.create({
      data: { name: 'Role Org', slug: 'role-org', isActive: true },
    });

    const user = await prisma.user.create({
      data: {
        organizationId: organization.id,
        email: 'user@role-org.test',
        passwordHash: 'hashed-password',
        firstName: 'Role',
        lastName: 'User',
      },
    });

    const role = await roleService.createRole({
      organizationId: organization.id,
      name: 'dispatcher',
    });

    await roleService.assignRoleToUser(user.id, role.id);

    const assignment = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
    });
    expect(assignment).not.toBeNull();

    await roleService.removeRoleFromUser(user.id, role.id);

    const removedAssignment = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
    });
    expect(removedAssignment).toBeNull();
  });

  it('prevents duplicate role assignments', async () => {
    const organization = await prisma.organization.create({
      data: { name: 'Duplicate Org', slug: 'duplicate-org', isActive: true },
    });

    const user = await prisma.user.create({
      data: {
        organizationId: organization.id,
        email: 'dup@duplicate-org.test',
        passwordHash: 'hashed-password',
        firstName: 'Dup',
        lastName: 'User',
      },
    });

    const role = await roleService.createRole({
      organizationId: organization.id,
      name: 'driver',
    });

    await roleService.assignRoleToUser(user.id, role.id);

    await expect(roleService.assignRoleToUser(user.id, role.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});

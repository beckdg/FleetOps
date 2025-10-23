import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../src/database/prisma.service';
import { PermissionResolutionService } from '../../src/permissions/permission-resolution.service';
import { PermissionService } from '../../src/permissions/permissions.service';
import { RoleService } from '../../src/roles/roles.service';
import { resetDatabase } from './helpers/database.helper';
import { IdentityTestModule } from './identity-test.module';

describe('PermissionResolutionService (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let permissionResolutionService: PermissionResolutionService;
  let permissionService: PermissionService;
  let roleService: RoleService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [IdentityTestModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    permissionResolutionService = moduleRef.get(PermissionResolutionService);
    permissionService = moduleRef.get(PermissionService);
    roleService = moduleRef.get(RoleService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleRef.close();
  });

  it('aggregates permissions from multiple roles without duplicates', async () => {
    const organization = await prisma.organization.create({
      data: { name: 'Acme Fleet', slug: 'acme-fleet', isActive: true },
    });

    const user = await prisma.user.create({
      data: {
        organizationId: organization.id,
        email: 'dispatcher@acme.test',
        passwordHash: 'hashed-password',
        firstName: 'Dispatch',
        lastName: 'User',
      },
    });

    const usersRead = await permissionService.createPermission({
      resource: 'users',
      action: 'read',
    });
    const vehiclesRead = await permissionService.createPermission({
      resource: 'vehicles',
      action: 'read',
    });
    const usersWrite = await permissionService.createPermission({
      resource: 'users',
      action: 'write',
    });

    const roleA = await roleService.createRole({
      organizationId: organization.id,
      name: 'role_a',
    });
    const roleB = await roleService.createRole({
      organizationId: organization.id,
      name: 'role_b',
    });

    await permissionService.assignPermissionToRole(roleA.id, usersRead.id);
    await permissionService.assignPermissionToRole(roleB.id, vehiclesRead.id);
    await permissionService.assignPermissionToRole(roleA.id, usersWrite.id);
    await permissionService.assignPermissionToRole(roleB.id, usersRead.id);

    await roleService.assignRoleToUser(user.id, roleA.id);
    await roleService.assignRoleToUser(user.id, roleB.id);

    const permissions = await permissionResolutionService.resolveUserPermissions(user.id);

    expect(permissions).toEqual(['users.read', 'users.write', 'vehicles.read']);
  });
});

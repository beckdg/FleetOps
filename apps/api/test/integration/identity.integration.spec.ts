import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../src/database/prisma.service';
import { OrganizationService } from '../../src/organizations/organizations.service';
import { RoleService } from '../../src/roles/roles.service';
import { UserService } from '../../src/users/users.service';
import { IdentityTestModule } from './identity-test.module';
import { resetDatabase } from './helpers/database.helper';

describe('Identity foundation (integration)', () => {
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let userService: UserService;
  let roleService: RoleService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [IdentityTestModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    userService = moduleRef.get(UserService);
    roleService = moduleRef.get(RoleService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await moduleRef.close();
  });

  it('creates an organization', async () => {
    const organization = await organizationService.createOrganization({
      name: 'FleetOps Demo',
      slug: 'fleetops-demo',
    });

    expect(organization).toMatchObject({
      name: 'FleetOps Demo',
      slug: 'fleetops-demo',
      isActive: true,
    });
  });

  it('creates a user within an organization', async () => {
    const organization = await organizationService.createOrganization({
      name: 'Tenant Org',
      slug: 'tenant-org',
    });

    const user = await userService.createUser({
      organizationId: organization.id,
      email: 'admin@tenant-org.test',
      password: 'StrongPassword123!',
      firstName: 'Tenant',
      lastName: 'Admin',
    });

    expect(user.organizationId).toBe(organization.id);
    expect(user.email).toBe('admin@tenant-org.test');
    expect(user.passwordHash).not.toBe('StrongPassword123!');
    expect(user.deletedAt).toBeNull();
  });

  it('assigns a role to a user within the same organization', async () => {
    const organization = await organizationService.createOrganization({
      name: 'Assign Org',
      slug: 'assign-org',
    });

    const user = await userService.createUser({
      organizationId: organization.id,
      email: 'member@assign-org.test',
      password: 'StrongPassword123!',
      firstName: 'Member',
      lastName: 'User',
    });

    const role = await roleService.createRole({
      organizationId: organization.id,
      name: 'dispatcher',
      description: 'Trip dispatcher',
    });

    await roleService.assignRoleToUser(user.id, role.id);

    const assignment = await prisma.userRole.findUnique({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
    });

    expect(assignment).not.toBeNull();
  });
});

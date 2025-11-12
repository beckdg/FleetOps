import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { ADMIN_ROLE_NAME } from '../../src/authorization/constants/authorization.constants';
import { OrganizationService } from '../../src/organizations/organizations.service';
import { PermissionService } from '../../src/permissions/permissions.service';
import { PrismaService } from '../../src/database/prisma.service';
import { RoleService } from '../../src/roles/roles.service';
import { UserService } from '../../src/users/users.service';
import { API_GLOBAL_PREFIX } from '../../src/shared/constants/app.constants';
import { configureApp } from '../../src/shared/bootstrap/configure-app';
import { AuthorizationTestModule } from './authorization-test.module';
import { resetDatabase } from './helpers/database.helper';

const PROTECTED_BASE = `/${API_GLOBAL_PREFIX}/test-protected`;
const AUTH_BASE = `/${API_GLOBAL_PREFIX}/auth`;

describe('Authorization (integration)', () => {
  let app: INestApplication<App>;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let userService: UserService;
  let roleService: RoleService;
  let permissionService: PermissionService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AuthorizationTestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    userService = moduleRef.get(UserService);
    roleService = moduleRef.get(RoleService);
    permissionService = moduleRef.get(PermissionService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
    await moduleRef.close();
  });

  async function createOrganization(slug: string) {
    return organizationService.createOrganization({
      name: slug,
      slug,
    });
  }

  async function createUser(
    organizationId: string,
    email: string,
    password = 'StrongPassword123!',
  ) {
    return userService.createUser({
      organizationId,
      email,
      password,
      firstName: 'Authz',
      lastName: 'User',
    });
  }

  async function login(organizationSlug: string, email: string, password = 'StrongPassword123!') {
    const response = await request(app.getHttpServer())
      .post(`${AUTH_BASE}/login`)
      .send({ organizationSlug, email, password })
      .expect(200);

    return response.body.accessToken as string;
  }

  async function assignPermissionToRoleByKey(
    organizationId: string,
    roleName: string,
    resource: string,
    action: string,
  ) {
    const role = await roleService.findByName(organizationId, roleName);
    const permission = await permissionService.findByResourceAndAction(resource, action);

    if (!role || !permission) {
      throw new Error('Role or permission not found for test setup');
    }

    await permissionService.assignPermissionToRole(role.id, permission.id);
  }

  it('allows access when the user has the required permission', async () => {
    const organization = await createOrganization('authz-allowed-org');
    const role = await roleService.createRole({
      organizationId: organization.id,
      name: 'fleet_manager',
    });
    const permission = await permissionService.createPermission({
      resource: 'users',
      action: 'read',
    });

    const user = await createUser(organization.id, 'allowed@authz.test');
    await permissionService.assignPermissionToRole(role.id, permission.id);
    await roleService.assignRoleToUser(user.id, role.id);

    const accessToken = await login(organization.slug, user.email);

    const response = await request(app.getHttpServer())
      .get(`${PROTECTED_BASE}/users`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual({ resource: 'users' });
  });

  it('denies access when the user lacks the required permission', async () => {
    const organization = await createOrganization('authz-denied-org');
    const user = await createUser(organization.id, 'denied@authz.test');
    const accessToken = await login(organization.slug, user.email);

    const response = await request(app.getHttpServer())
      .get(`${PROTECTED_BASE}/users`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    expect(response.body.message).toBe('Insufficient permissions');
  });

  it('allows admin users to bypass permission checks', async () => {
    const organization = await createOrganization('authz-admin-org');
    const adminRole = await roleService.createRole({
      organizationId: organization.id,
      name: ADMIN_ROLE_NAME,
    });
    const user = await createUser(organization.id, 'admin@authz.test');

    await roleService.assignRoleToUser(user.id, adminRole.id);

    const accessToken = await login(organization.slug, user.email);

    await request(app.getHttpServer())
      .get(`${PROTECTED_BASE}/users`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`${PROTECTED_BASE}/vehicles`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('aggregates permissions across multiple roles', async () => {
    const organization = await createOrganization('authz-multi-role-org');
    const usersRole = await roleService.createRole({
      organizationId: organization.id,
      name: 'users_reader',
    });
    const vehiclesRole = await roleService.createRole({
      organizationId: organization.id,
      name: 'vehicles_reader',
    });

    const usersRead = await permissionService.createPermission({
      resource: 'users',
      action: 'read',
    });
    const vehiclesRead = await permissionService.createPermission({
      resource: 'vehicles',
      action: 'read',
    });

    const user = await createUser(organization.id, 'multi-role@authz.test');

    await permissionService.assignPermissionToRole(usersRole.id, usersRead.id);
    await permissionService.assignPermissionToRole(vehiclesRole.id, vehiclesRead.id);
    await roleService.assignRoleToUser(user.id, usersRole.id);
    await roleService.assignRoleToUser(user.id, vehiclesRole.id);

    const accessToken = await login(organization.slug, user.email);

    await request(app.getHttpServer())
      .get(`${PROTECTED_BASE}/users`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`${PROTECTED_BASE}/vehicles`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
  });

  it('denies cross-organization access for organization-scoped routes', async () => {
    const organizationA = await createOrganization('authz-org-a');
    const organizationB = await createOrganization('authz-org-b');
    const role = await roleService.createRole({
      organizationId: organizationA.id,
      name: 'org_a_reader',
    });

    await permissionService.createPermission({ resource: 'users', action: 'read' });
    await assignPermissionToRoleByKey(organizationA.id, role.name, 'users', 'read');

    const user = await createUser(organizationA.id, 'cross-org@authz.test');
    await roleService.assignRoleToUser(user.id, role.id);

    const accessToken = await login(organizationA.slug, user.email);

    const response = await request(app.getHttpServer())
      .get(`${PROTECTED_BASE}/organizations/${organizationB.id}/users`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(403);

    expect(response.body.message).toBe('Cross-organization access denied');
  });
});

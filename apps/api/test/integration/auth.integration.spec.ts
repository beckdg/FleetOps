import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { DEFAULT_REGISTRATION_ROLE } from '../../src/auth/constants/auth.constants';
import { PrismaService } from '../../src/database/prisma.service';
import { OrganizationService } from '../../src/organizations/organizations.service';
import { RoleService } from '../../src/roles/roles.service';
import { UserService } from '../../src/users/users.service';
import { API_GLOBAL_PREFIX } from '../../src/shared/constants/app.constants';
import { configureApp } from '../../src/shared/bootstrap/configure-app';
import { AuthTestModule } from './auth-test.module';
import { resetDatabase } from './helpers/database.helper';

const AUTH_BASE = `/${API_GLOBAL_PREFIX}/auth`;

describe('Auth (integration)', () => {
  let app: INestApplication<App>;
  let moduleRef: TestingModule;
  let prisma: PrismaService;
  let organizationService: OrganizationService;
  let roleService: RoleService;
  let userService: UserService;

  beforeAll(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [AuthTestModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = moduleRef.get(PrismaService);
    organizationService = moduleRef.get(OrganizationService);
    roleService = moduleRef.get(RoleService);
    userService = moduleRef.get(UserService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
    await moduleRef.close();
  });

  async function seedOrganizationWithDefaultRole(slug = 'auth-test-org') {
    const organization = await organizationService.createOrganization({
      name: 'Auth Test Org',
      slug,
    });

    await roleService.createRole({
      organizationId: organization.id,
      name: DEFAULT_REGISTRATION_ROLE,
    });

    return organization;
  }

  it('registers a user, assigns the default role, and returns tokens', async () => {
    const organization = await seedOrganizationWithDefaultRole();

    const response = await request(app.getHttpServer())
      .post(`${AUTH_BASE}/register`)
      .send({
        organizationSlug: organization.slug,
        email: 'new.user@auth-test.test',
        password: 'StrongPassword123!',
        firstName: 'New',
        lastName: 'User',
      })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));

    const user = await prisma.user.findFirst({
      where: {
        organizationId: organization.id,
        email: 'new.user@auth-test.test',
      },
    });

    expect(user).not.toBeNull();

    const roleAssignment = await prisma.userRole.findFirst({
      where: {
        userId: user!.id,
        role: {
          name: DEFAULT_REGISTRATION_ROLE,
        },
      },
    });

    expect(roleAssignment).not.toBeNull();
  });

  it('logs in with valid credentials and returns tokens', async () => {
    const organization = await seedOrganizationWithDefaultRole('login-org');

    await userService.createUser({
      organizationId: organization.id,
      email: 'login.user@auth-test.test',
      password: 'StrongPassword123!',
      firstName: 'Login',
      lastName: 'User',
    });

    const response = await request(app.getHttpServer())
      .post(`${AUTH_BASE}/login`)
      .send({
        organizationSlug: organization.slug,
        email: 'login.user@auth-test.test',
        password: 'StrongPassword123!',
      })
      .expect(200);

    expect(response.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });

  it('rejects invalid credentials', async () => {
    const organization = await seedOrganizationWithDefaultRole('invalid-login-org');

    await userService.createUser({
      organizationId: organization.id,
      email: 'invalid.user@auth-test.test',
      password: 'StrongPassword123!',
      firstName: 'Invalid',
      lastName: 'User',
    });

    const response = await request(app.getHttpServer())
      .post(`${AUTH_BASE}/login`)
      .send({
        organizationSlug: organization.slug,
        email: 'invalid.user@auth-test.test',
        password: 'WrongPassword123!',
      })
      .expect(401);

    expect(response.body.message).toBe('Invalid credentials');
  });

  it('rejects inactive users during login', async () => {
    const organization = await seedOrganizationWithDefaultRole('inactive-org');

    const user = await userService.createUser({
      organizationId: organization.id,
      email: 'inactive.user@auth-test.test',
      password: 'StrongPassword123!',
      firstName: 'Inactive',
      lastName: 'User',
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { isActive: false },
    });

    const response = await request(app.getHttpServer())
      .post(`${AUTH_BASE}/login`)
      .send({
        organizationSlug: organization.slug,
        email: 'inactive.user@auth-test.test',
        password: 'StrongPassword123!',
      })
      .expect(401);

    expect(response.body.message).toBe('User account is inactive');
  });

  it('rotates refresh tokens and revokes the previous token', async () => {
    const organization = await seedOrganizationWithDefaultRole('refresh-org');

    const loginResponse = await request(app.getHttpServer())
      .post(`${AUTH_BASE}/register`)
      .send({
        organizationSlug: organization.slug,
        email: 'refresh.user@auth-test.test',
        password: 'StrongPassword123!',
        firstName: 'Refresh',
        lastName: 'User',
      })
      .expect(201);

    const originalRefreshToken = loginResponse.body.refreshToken as string;

    const refreshResponse = await request(app.getHttpServer())
      .post(`${AUTH_BASE}/refresh`)
      .send({ refreshToken: originalRefreshToken })
      .expect(200);

    expect(refreshResponse.body.accessToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).toEqual(expect.any(String));
    expect(refreshResponse.body.refreshToken).not.toBe(originalRefreshToken);

    await request(app.getHttpServer())
      .post(`${AUTH_BASE}/refresh`)
      .send({ refreshToken: originalRefreshToken })
      .expect(401);
  });

  it('revokes refresh tokens on logout', async () => {
    const organization = await seedOrganizationWithDefaultRole('logout-org');

    const loginResponse = await request(app.getHttpServer())
      .post(`${AUTH_BASE}/register`)
      .send({
        organizationSlug: organization.slug,
        email: 'logout.user@auth-test.test',
        password: 'StrongPassword123!',
        firstName: 'Logout',
        lastName: 'User',
      })
      .expect(201);

    const refreshToken = loginResponse.body.refreshToken as string;

    await request(app.getHttpServer())
      .post(`${AUTH_BASE}/logout`)
      .send({ refreshToken })
      .expect(204);

    await request(app.getHttpServer())
      .post(`${AUTH_BASE}/refresh`)
      .send({ refreshToken })
      .expect(401);
  });

  it('returns the authenticated user profile from /auth/me', async () => {
    const organization = await seedOrganizationWithDefaultRole('me-org');

    const registerResponse = await request(app.getHttpServer())
      .post(`${AUTH_BASE}/register`)
      .send({
        organizationSlug: organization.slug,
        email: 'me.user@auth-test.test',
        password: 'StrongPassword123!',
        firstName: 'Me',
        lastName: 'User',
      })
      .expect(201);

    const accessToken = registerResponse.body.accessToken as string;

    const response = await request(app.getHttpServer())
      .get(`${AUTH_BASE}/me`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      email: 'me.user@auth-test.test',
      firstName: 'Me',
      lastName: 'User',
      organizationId: organization.id,
      isActive: true,
    });
    expect(response.body.id).toEqual(expect.any(String));
    expect(response.body.roleIds).toEqual(expect.any(Array));
    expect(response.body).not.toHaveProperty('passwordHash');
  });
});

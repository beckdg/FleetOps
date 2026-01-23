import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';

import { DEFAULT_REGISTRATION_ROLE } from '../../src/auth/constants/auth.constants';
import { JwtPayload } from '../../src/auth/interfaces/jwt-payload.interface';
import { hashRefreshToken } from '../../src/auth/utils/token.util';
import { EnvironmentVariables } from '../../src/shared/constants/env.validation';
import {
  AUTH_BASE,
  DEFAULT_PASSWORD,
  HttpTestEnv,
  apiPath,
  bootstrapHttpTestEnv,
  createOrganization,
  createUser,
  login,
  prepareHttpTestDatabase,
  seedDefaultPermissions,
  teardownHttpTestEnv,
} from './helpers/http-test.helper';
import { RoleService } from '../../src/roles/roles.service';
import { UserService } from '../../src/users/users.service';

describe('Auth security (integration)', () => {
  let env: HttpTestEnv;
  let jwtService: JwtService;
  let configService: ConfigService<EnvironmentVariables, true>;
  let roleService: RoleService;
  let userService: UserService;

  beforeAll(async () => {
    env = await bootstrapHttpTestEnv();
    jwtService = env.moduleRef.get(JwtService);
    configService = env.moduleRef.get(ConfigService);
    roleService = env.moduleRef.get(RoleService);
    userService = env.moduleRef.get(UserService);
  });

  beforeEach(async () => {
    await prepareHttpTestDatabase(env);
  });

  afterAll(async () => {
    await teardownHttpTestEnv(env);
  });

  async function seedActiveOrganizationWithDefaultRole(slug: string) {
    const organization = await createOrganization(env, slug);

    await roleService.createRole({
      organizationId: organization.id,
      name: DEFAULT_REGISTRATION_ROLE,
    });

    return organization;
  }

  async function registerUser(organizationSlug: string, email: string) {
    return request(env.app.getHttpServer()).post(`${AUTH_BASE}/register`).send({
      organizationSlug,
      email,
      password: DEFAULT_PASSWORD,
      firstName: 'Security',
      lastName: 'Tester',
    });
  }

  async function signAccessToken(payload: JwtPayload, expiresIn: string): Promise<string> {
    return jwtService.signAsync(payload, {
      secret: configService.get('JWT_SECRET', { infer: true }),
      expiresIn,
    });
  }

  async function createSignedInUser(slug: string, email: string) {
    const organization = await seedActiveOrganizationWithDefaultRole(slug);
    const registerResponse = await registerUser(organization.slug, email).expect(201);

    return {
      organization,
      accessToken: registerResponse.body.accessToken as string,
      refreshToken: registerResponse.body.refreshToken as string,
      email,
    };
  }

  describe('access token security', () => {
    it('rejects requests with a missing Authorization header', async () => {
      await request(env.app.getHttpServer()).get(`${AUTH_BASE}/me`).expect(401);

      await request(env.app.getHttpServer()).get(apiPath('/vehicles')).expect(401);
    });

    it('rejects malformed JWT access tokens', async () => {
      const malformedTokens = [
        'not-a-jwt',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        '',
      ];

      for (const token of malformedTokens) {
        await request(env.app.getHttpServer())
          .get(`${AUTH_BASE}/me`)
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      }
    });

    it('rejects expired JWT access tokens', async () => {
      const session = await createSignedInUser(
        'security-expired-jwt-org',
        'expired.jwt@security.test',
      );
      const user = await env.prisma.user.findFirstOrThrow({
        where: { email: session.email, organizationId: session.organization.id },
      });

      const expiredToken = await signAccessToken(
        {
          sub: user.id,
          organizationId: session.organization.id,
          email: session.email,
          roleIds: [],
        },
        '-1s',
      );

      await request(env.app.getHttpServer())
        .get(`${AUTH_BASE}/me`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      await request(env.app.getHttpServer())
        .get(apiPath('/vehicles'))
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('rejects access tokens signed with the wrong secret', async () => {
      const session = await createSignedInUser(
        'security-wrong-secret-org',
        'wrong.secret@security.test',
      );
      const user = await env.prisma.user.findFirstOrThrow({
        where: { email: session.email, organizationId: session.organization.id },
      });

      const forgedToken = await jwtService.signAsync(
        {
          sub: user.id,
          organizationId: session.organization.id,
          email: session.email,
          roleIds: [],
        },
        {
          secret: 'totally-wrong-secret-that-is-long-enough-123456',
          expiresIn: '15m',
        },
      );

      await request(env.app.getHttpServer())
        .get(`${AUTH_BASE}/me`)
        .set('Authorization', `Bearer ${forgedToken}`)
        .expect(401);
    });
  });

  describe('refresh token security', () => {
    it('rejects refresh token replay after rotation', async () => {
      const organization = await seedActiveOrganizationWithDefaultRole('security-replay-org');
      const registerResponse = await registerUser(organization.slug, 'replay@security.test').expect(
        201,
      );
      const stolenRefreshToken = registerResponse.body.refreshToken as string;

      const rotationResponse = await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/refresh`)
        .send({ refreshToken: stolenRefreshToken })
        .expect(200);

      const rotatedRefreshToken = rotationResponse.body.refreshToken as string;
      expect(rotatedRefreshToken).not.toBe(stolenRefreshToken);

      await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/refresh`)
        .send({ refreshToken: stolenRefreshToken })
        .expect(401)
        .expect((response) => {
          expect(response.body.message).toBe('Invalid or expired refresh token');
        });

      await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/refresh`)
        .send({ refreshToken: rotatedRefreshToken })
        .expect(200);
    });

    it('rejects reuse of a revoked refresh token', async () => {
      const organization = await seedActiveOrganizationWithDefaultRole('security-revoked-org');
      const registerResponse = await registerUser(
        organization.slug,
        'revoked@security.test',
      ).expect(201);
      const refreshToken = registerResponse.body.refreshToken as string;
      const tokenHash = hashRefreshToken(refreshToken);

      const storedToken = await env.prisma.refreshToken.findFirstOrThrow({
        where: { tokenHash },
      });

      await env.prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });

      await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/refresh`)
        .send({ refreshToken })
        .expect(401)
        .expect((response) => {
          expect(response.body.message).toBe('Invalid or expired refresh token');
        });
    });

    it('invalidates refresh tokens on logout', async () => {
      const organization = await seedActiveOrganizationWithDefaultRole('security-logout-org');
      const registerResponse = await registerUser(organization.slug, 'logout@security.test').expect(
        201,
      );
      const refreshToken = registerResponse.body.refreshToken as string;
      const tokenHash = hashRefreshToken(refreshToken);

      await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/logout`)
        .send({ refreshToken })
        .expect(204);

      const storedToken = await env.prisma.refreshToken.findFirstOrThrow({
        where: { tokenHash },
      });
      expect(storedToken.revokedAt).not.toBeNull();

      await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/refresh`)
        .send({ refreshToken })
        .expect(401)
        .expect((response) => {
          expect(response.body.message).toBe('Invalid or expired refresh token');
        });
    });

    it('rejects refresh attempts with an expired refresh token record', async () => {
      const organization = await seedActiveOrganizationWithDefaultRole(
        'security-expired-refresh-org',
      );
      const registerResponse = await registerUser(
        organization.slug,
        'expired.refresh@security.test',
      ).expect(201);
      const refreshToken = registerResponse.body.refreshToken as string;
      const tokenHash = hashRefreshToken(refreshToken);

      await env.prisma.refreshToken.updateMany({
        where: { tokenHash },
        data: { expiresAt: new Date(Date.now() - 60_000) },
      });

      await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/refresh`)
        .send({ refreshToken })
        .expect(401)
        .expect((response) => {
          expect(response.body.message).toBe('Invalid or expired refresh token');
        });
    });
  });

  describe('account and organization security', () => {
    it('rejects registration for inactive organizations', async () => {
      const organization = await env.organizationService.createOrganization({
        name: 'Inactive Org',
        slug: 'inactive-security-org',
        isActive: false,
      });

      await roleService.createRole({
        organizationId: organization.id,
        name: DEFAULT_REGISTRATION_ROLE,
      });

      await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/register`)
        .send({
          organizationSlug: organization.slug,
          email: 'blocked.register@security.test',
          password: DEFAULT_PASSWORD,
          firstName: 'Blocked',
          lastName: 'Register',
        })
        .expect(400)
        .expect((response) => {
          expect(response.body.message).toBe('Organization is inactive');
        });

      const createdUser = await env.prisma.user.findFirst({
        where: {
          organizationId: organization.id,
          email: 'blocked.register@security.test',
        },
      });

      expect(createdUser).toBeNull();
    });

    it('rejects login for inactive users', async () => {
      const organization = await seedActiveOrganizationWithDefaultRole(
        'security-inactive-user-org',
      );
      const user = await createUser(env, organization.id, 'inactive.user@security.test');

      await env.prisma.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });

      await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/login`)
        .send({
          organizationSlug: organization.slug,
          email: 'inactive.user@security.test',
          password: DEFAULT_PASSWORD,
        })
        .expect(401)
        .expect((response) => {
          expect(response.body.message).toBe('User account is inactive');
        });
    });

    it('rejects login for soft-deleted users', async () => {
      const organization = await seedActiveOrganizationWithDefaultRole('security-soft-delete-org');
      const user = await createUser(env, organization.id, 'deleted.user@security.test');

      await userService.deactivateUser(user.id);

      const deletedUser = await env.prisma.user.findUnique({ where: { id: user.id } });
      expect(deletedUser?.deletedAt).not.toBeNull();
      expect(deletedUser?.isActive).toBe(false);

      await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/login`)
        .send({
          organizationSlug: organization.slug,
          email: 'deleted.user@security.test',
          password: DEFAULT_PASSWORD,
        })
        .expect(401)
        .expect((response) => {
          expect(response.body.message).toBe('Invalid credentials');
        });
    });

    it('rejects refresh for users deactivated after tokens were issued', async () => {
      const organization = await seedActiveOrganizationWithDefaultRole(
        'security-deactivate-refresh-org',
      );
      const user = await createUser(env, organization.id, 'deactivate.refresh@security.test');

      const loginResponse = await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/login`)
        .send({
          organizationSlug: organization.slug,
          email: 'deactivate.refresh@security.test',
          password: DEFAULT_PASSWORD,
        })
        .expect(200);

      const refreshToken = loginResponse.body.refreshToken as string;

      await userService.deactivateUser(user.id);

      await request(env.app.getHttpServer())
        .post(`${AUTH_BASE}/refresh`)
        .send({ refreshToken })
        .expect(401)
        .expect((response) => {
          expect(response.body.message).toBe('Invalid or expired refresh token');
        });
    });

    it('rejects protected requests when the user was soft-deleted after login', async () => {
      const organization = await seedActiveOrganizationWithDefaultRole(
        'security-deleted-access-org',
      );
      const user = await createUser(env, organization.id, 'deleted.access@security.test');
      await seedDefaultPermissions(env);

      const accessToken = await login(env, organization.slug, 'deleted.access@security.test');

      await userService.deactivateUser(user.id);

      await request(env.app.getHttpServer())
        .get(`${AUTH_BASE}/me`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401)
        .expect((response) => {
          expect(response.body.message).toBe('Invalid or expired access token');
        });
    });
  });
});

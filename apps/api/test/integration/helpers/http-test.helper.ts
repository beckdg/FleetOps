import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { ADMIN_ROLE_NAME } from '../../../src/authorization/constants/authorization.constants';
import { OrganizationService } from '../../../src/organizations/organizations.service';
import { PermissionService } from '../../../src/permissions/permissions.service';
import { PrismaService } from '../../../src/database/prisma.service';
import { RoleService } from '../../../src/roles/roles.service';
import { UserService } from '../../../src/users/users.service';
import { API_GLOBAL_PREFIX } from '../../../src/shared/constants/app.constants';
import { configureApp } from '../../../src/shared/bootstrap/configure-app';
import { DEFAULT_PERMISSIONS } from '../../../prisma/seeds/permissions.seed';
import { HttpAppModule } from '../http-app.module';
import { resetDatabase } from './database.helper';

export const AUTH_BASE = `/${API_GLOBAL_PREFIX}/auth`;
export const API_BASE = `/${API_GLOBAL_PREFIX}`;
export const DEFAULT_PASSWORD = 'StrongPassword123!';

export interface HttpTestEnv {
  app: INestApplication<App>;
  moduleRef: TestingModule;
  prisma: PrismaService;
  organizationService: OrganizationService;
  userService: UserService;
  roleService: RoleService;
  permissionService: PermissionService;
}

export interface PermissionSpec {
  resource: string;
  action: string;
}

export type HttpMethod = 'get' | 'post' | 'patch' | 'delete';

export interface ProtectedEndpointSpec<TContext> {
  label: string;
  method: HttpMethod;
  path: string | ((ctx: TContext) => string);
  permission: PermissionSpec;
  permissions?: PermissionSpec[];
  body?: object | ((ctx: TContext) => object | undefined);
  query?: Record<string, string> | ((ctx: TContext) => Record<string, string> | undefined);
  successStatus?: number;
  prepareAuthorizedContext?: (ctx: TContext) => Promise<TContext>;
  prepareAdminContext?: (ctx: TContext) => Promise<TContext>;
  onAuthorizedUser?: (ctx: TContext, user: { id: string }) => Promise<TContext>;
  onAdminUser?: (ctx: TContext, user: { id: string }) => Promise<TContext>;
}

export interface RequireAllPermissionsSpec<TContext> {
  label: string;
  method: HttpMethod;
  path: string | ((ctx: TContext) => string);
  permissions: PermissionSpec[];
  body?: object | ((ctx: TContext) => object | undefined);
  query?: Record<string, string> | ((ctx: TContext) => Record<string, string> | undefined);
  successStatus?: number;
  prepareAuthorizedContext?: (ctx: TContext) => Promise<TContext>;
}

export async function bootstrapHttpTestEnv(): Promise<HttpTestEnv> {
  const moduleRef = await Test.createTestingModule({
    imports: [HttpAppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();

  return {
    app,
    moduleRef,
    prisma: moduleRef.get(PrismaService),
    organizationService: moduleRef.get(OrganizationService),
    userService: moduleRef.get(UserService),
    roleService: moduleRef.get(RoleService),
    permissionService: moduleRef.get(PermissionService),
  };
}

export async function teardownHttpTestEnv(env: HttpTestEnv): Promise<void> {
  await env.prisma.$disconnect();
  await env.app.close();
  await env.moduleRef.close();
}

export async function prepareHttpTestDatabase(env: HttpTestEnv): Promise<void> {
  await resetDatabase(env.prisma);
  await seedDefaultPermissions(env);
}

export async function seedDefaultPermissions(env: HttpTestEnv): Promise<void> {
  for (const permission of DEFAULT_PERMISSIONS) {
    await env.permissionService.createPermission(permission);
  }
}

export function apiPath(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function login(
  env: HttpTestEnv,
  organizationSlug: string,
  email: string,
  password = DEFAULT_PASSWORD,
): Promise<string> {
  const response = await request(env.app.getHttpServer())
    .post(`${AUTH_BASE}/login`)
    .send({ organizationSlug, email, password })
    .expect(200);

  return response.body.accessToken as string;
}

export async function createOrganization(env: HttpTestEnv, slug: string) {
  return env.organizationService.createOrganization({ name: slug, slug });
}

export async function createUser(
  env: HttpTestEnv,
  organizationId: string,
  email: string,
  password = DEFAULT_PASSWORD,
) {
  return env.userService.createUser({
    organizationId,
    email,
    password,
    firstName: 'Http',
    lastName: 'Tester',
  });
}

export async function assignPermissionsToUser(
  env: HttpTestEnv,
  organizationId: string,
  userId: string,
  permissions: PermissionSpec[],
  roleName = 'custom_role',
): Promise<void> {
  const role = await env.roleService.createRole({
    organizationId,
    name: `${roleName}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  });

  for (const permission of permissions) {
    const record = await env.permissionService.findByResourceAndAction(
      permission.resource,
      permission.action,
    );

    if (!record) {
      throw new Error(`Permission ${permission.resource}:${permission.action} not found`);
    }

    await env.permissionService.assignPermissionToRole(role.id, record.id);
  }

  await env.roleService.assignRoleToUser(userId, role.id);
}

export async function assignAdminRole(
  env: HttpTestEnv,
  organizationId: string,
  userId: string,
): Promise<void> {
  const adminRole = await env.roleService.createRole({
    organizationId,
    name: ADMIN_ROLE_NAME,
  });
  await env.roleService.assignRoleToUser(userId, adminRole.id);
}

export async function createAuthenticatedUser(
  env: HttpTestEnv,
  organizationId: string,
  organizationSlug: string,
  email: string,
  permissions: PermissionSpec[] = [],
) {
  const user = await createUser(env, organizationId, email);

  if (permissions.length > 0) {
    await assignPermissionsToUser(env, organizationId, user.id, permissions);
  }

  const token = await login(env, organizationSlug, email);
  return { user, token };
}

export async function createAdminUser(
  env: HttpTestEnv,
  organizationId: string,
  organizationSlug: string,
  email: string,
) {
  const user = await createUser(env, organizationId, email);
  await assignAdminRole(env, organizationId, user.id);
  const token = await login(env, organizationSlug, email);
  return { user, token };
}

function sendRequest(
  env: HttpTestEnv,
  method: HttpMethod,
  path: string,
  token?: string,
  body?: object,
  query?: Record<string, string>,
) {
  let req = request(env.app.getHttpServer())[method](apiPath(path));

  if (token) {
    req = req.set('Authorization', `Bearer ${token}`);
  }

  if (query) {
    req = req.query(query);
  }

  if (body !== undefined) {
    req = req.send(body);
  }

  return req;
}

function resolvePath<TContext>(path: string | ((ctx: TContext) => string), ctx: TContext): string {
  return typeof path === 'function' ? path(ctx) : path;
}

function resolveBody<TContext>(
  body: object | ((ctx: TContext) => object | undefined) | undefined,
  ctx: TContext,
): object | undefined {
  if (body === undefined) {
    return undefined;
  }

  return typeof body === 'function' ? body(ctx) : body;
}

function resolveQuery<TContext>(
  query:
    | Record<string, string>
    | ((ctx: TContext) => Record<string, string> | undefined)
    | undefined,
  ctx: TContext,
): Record<string, string> | undefined {
  if (query === undefined) {
    return undefined;
  }

  return typeof query === 'function' ? query(ctx) : query;
}

function uniqueEmail(label: string): string {
  return `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@http.test`;
}

export function registerProtectedEndpointRbacTests<
  TContext extends { organization: { id: string; slug: string } },
>(
  getEnv: () => HttpTestEnv,
  getBaseContext: () => TContext,
  spec: ProtectedEndpointSpec<TContext>,
): void {
  const successStatus = spec.successStatus ?? (spec.method === 'post' ? 201 : 200);

  describe(`${spec.method.toUpperCase()} ${spec.label}`, () => {
    it('returns 401 when unauthenticated', async () => {
      const env = getEnv();
      const ctx = getBaseContext();

      await sendRequest(
        env,
        spec.method,
        resolvePath(spec.path, ctx),
        undefined,
        resolveBody(spec.body, ctx),
        resolveQuery(spec.query, ctx),
      ).expect(401);
    });

    it('returns 403 when authenticated without permission', async () => {
      const env = getEnv();
      const ctx = getBaseContext();
      const { token } = await createAuthenticatedUser(
        env,
        ctx.organization.id,
        ctx.organization.slug,
        uniqueEmail(`denied-${spec.label}`),
      );

      await sendRequest(
        env,
        spec.method,
        resolvePath(spec.path, ctx),
        token,
        resolveBody(spec.body, ctx),
        resolveQuery(spec.query, ctx),
      )
        .expect(403)
        .expect((response) => {
          expect(response.body.message).toBe('Insufficient permissions');
        });
    });

    it('succeeds when authenticated with required permission', async () => {
      const env = getEnv();
      let ctx = getBaseContext();

      if (spec.prepareAuthorizedContext) {
        ctx = await spec.prepareAuthorizedContext(ctx);
      }

      const { user, token } = await createAuthenticatedUser(
        env,
        ctx.organization.id,
        ctx.organization.slug,
        uniqueEmail(`allowed-${spec.label}`),
        spec.permissions ?? [spec.permission],
      );

      if (spec.onAuthorizedUser) {
        ctx = await spec.onAuthorizedUser(ctx, user);
      }

      await sendRequest(
        env,
        spec.method,
        resolvePath(spec.path, ctx),
        token,
        resolveBody(spec.body, ctx),
        resolveQuery(spec.query, ctx),
      ).expect(successStatus);
    });

    it('succeeds when authenticated as admin without explicit permission', async () => {
      const env = getEnv();
      let ctx = getBaseContext();

      if (spec.prepareAdminContext) {
        ctx = await spec.prepareAdminContext(ctx);
      } else if (spec.prepareAuthorizedContext) {
        ctx = await spec.prepareAuthorizedContext(ctx);
      }

      const { user, token } = await createAdminUser(
        env,
        ctx.organization.id,
        ctx.organization.slug,
        uniqueEmail(`admin-${spec.label}`),
      );

      if (spec.onAdminUser) {
        ctx = await spec.onAdminUser(ctx, user);
      }

      await sendRequest(
        env,
        spec.method,
        resolvePath(spec.path, ctx),
        token,
        resolveBody(spec.body, ctx),
        resolveQuery(spec.query, ctx),
      ).expect(successStatus);
    });
  });
}

export function registerRequireAllPermissionsTests<
  TContext extends { organization: { id: string; slug: string } },
>(
  getEnv: () => HttpTestEnv,
  getBaseContext: () => TContext,
  spec: RequireAllPermissionsSpec<TContext>,
): void {
  const successStatus = spec.successStatus ?? (spec.method === 'post' ? 201 : 200);
  const vehiclesPermission = spec.permissions.find(
    (permission) => permission.resource === 'vehicles',
  );
  const driversPermission = spec.permissions.find(
    (permission) => permission.resource === 'drivers',
  );

  if (!vehiclesPermission || !driversPermission) {
    throw new Error(
      `RequireAllPermissions spec "${spec.label}" must include vehicles and drivers permissions`,
    );
  }

  describe(`${spec.method.toUpperCase()} ${spec.label} (RequireAllPermissions)`, () => {
    it('returns 403 with vehicles permission only', async () => {
      const env = getEnv();
      const ctx = getBaseContext();
      const { token } = await createAuthenticatedUser(
        env,
        ctx.organization.id,
        ctx.organization.slug,
        uniqueEmail(`vehicles-only-${spec.label}`),
        [vehiclesPermission],
      );

      await sendRequest(
        env,
        spec.method,
        resolvePath(spec.path, ctx),
        token,
        resolveBody(spec.body, ctx),
        resolveQuery(spec.query, ctx),
      ).expect(403);
    });

    it('returns 403 with drivers permission only', async () => {
      const env = getEnv();
      const ctx = getBaseContext();
      const { token } = await createAuthenticatedUser(
        env,
        ctx.organization.id,
        ctx.organization.slug,
        uniqueEmail(`drivers-only-${spec.label}`),
        [driversPermission],
      );

      await sendRequest(
        env,
        spec.method,
        resolvePath(spec.path, ctx),
        token,
        resolveBody(spec.body, ctx),
        resolveQuery(spec.query, ctx),
      ).expect(403);
    });

    it('succeeds with both required permissions', async () => {
      const env = getEnv();
      let ctx = getBaseContext();

      if (spec.prepareAuthorizedContext) {
        ctx = await spec.prepareAuthorizedContext(ctx);
      }

      const { token } = await createAuthenticatedUser(
        env,
        ctx.organization.id,
        ctx.organization.slug,
        uniqueEmail(`both-perms-${spec.label}`),
        spec.permissions,
      );

      await sendRequest(
        env,
        spec.method,
        resolvePath(spec.path, ctx),
        token,
        resolveBody(spec.body, ctx),
        resolveQuery(spec.query, ctx),
      ).expect(successStatus);
    });
  });
}

export function runProtectedEndpointMatrix<
  TContext extends { organization: { id: string; slug: string } },
>(
  getEnv: () => HttpTestEnv,
  getContext: () => Promise<TContext> | TContext,
  specs: ProtectedEndpointSpec<TContext>[],
): void {
  for (const spec of specs) {
    registerProtectedEndpointRbacTests(
      getEnv,
      () => {
        const context = getContext();
        if (context instanceof Promise) {
          throw new Error(
            'runProtectedEndpointMatrix requires a synchronous context factory; use registerProtectedEndpointRbacTests for async setup',
          );
        }

        return context;
      },
      spec,
    );
  }
}

export async function expectCrossOrganizationDenied(
  env: HttpTestEnv,
  token: string,
  method: HttpMethod,
  path: string,
  body?: object,
  query?: Record<string, string>,
): Promise<void> {
  await sendRequest(env, method, path, token, body, query).expect(404);
}

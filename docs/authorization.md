# Authorization

FleetOps uses **organization-scoped RBAC** (Role-Based Access Control). Permissions are global definitions; roles and assignments are per-organization.

## Concepts

| Concept | Scope | Description |
| ------- | ----- | ----------- |
| **Permission** | Global | `resource:action` pair (e.g. `vehicles:read`) |
| **Role** | Organization | Named collection of permissions |
| **UserRole** | Organization | Links a user to a role |
| **Admin role** | Organization | Named `admin`; bypasses permission checks |

## Permission Model

Permissions use the format `resource:action`. Seeded permissions include:

| Resource | Actions |
| -------- | ------- |
| `users` | read, write |
| `vehicles` | read, write |
| `drivers` | read, write |
| `trips` | read, write |
| `maintenance` | read, write |
| `fuel` | read, write |
| `notifications` | read, write |
| `reports` | read |
| `integrations` | read, write |
| `jobs` | read, write |
| `audit` | read |
| `metrics` | read |

Source: `apps/api/prisma/seeds/permissions.seed.ts`

## Default Roles (seed)

| Role | Description |
| ---- | ----------- |
| `admin` | Full administrator — receives all permissions via seed |
| `fleet_manager` | Fleet operations |
| `dispatcher` | Trip coordination |
| `mechanic` | Vehicle maintenance |
| `driver` | Default registration role |

The demo admin user (`admin@fleetops-demo.test`) is assigned the `admin` role with all permissions.

## Route Protection

Controllers declare required permissions with decorators:

```typescript
@RequirePermission('vehicles', 'read')
@Get()
listVehicles() { ... }
```

Multiple permissions (all required):

```typescript
@RequireAllPermissions(
  { resource: 'vehicles', action: 'write' },
  { resource: 'drivers', action: 'write' },
)
```

Vehicle assignment endpoints require **both** `vehicles:write` and `drivers:write`.

## Authorization Flow

```
Request → JwtAuthGuard → PermissionGuard → Controller
                ↓                ↓
           401 if no JWT    403 if denied
```

### PermissionGuard logic

1. Skip if route is `@Public()`
2. Skip if no `@RequirePermission` metadata
3. Require authenticated user (401)
4. Deny cross-organization param access (403) when `@OrganizationScope` is used
5. **Admin bypass** — users with org `admin` role pass all permission checks
6. Otherwise resolve permissions via `PermissionResolutionService`
7. Log authorization decision to audit store

### Admin Bypass

Users assigned the organization `admin` role skip individual permission checks. This is intentional for tenant administrators and is audited with reason `admin_bypass`.

## Organization Isolation

All domain lookups use organization-scoped queries. Accessing another tenant's resource ID returns **404 Not Found** (not 403), preventing resource enumeration.

Examples:

- `GET /api/v1/vehicles/:id` — vehicle must belong to JWT organization
- `DELETE /api/v1/api-keys/:id` — key must belong to JWT organization

Integration tests in `organization-isolation-http.integration.spec.ts` verify this behavior.

## Audit

Authorization checks are logged via `AuthorizationAuditService` with:

- `allowed` / `denied`
- Reason: `admin_bypass`, `missing_permission`, `cross_organization`

Export audit events via `GET /api/v1/audit/export` (requires `audit:read`).

## Assigning Permissions

Permissions are assigned to roles, roles to users:

1. Create role: internal API / seed / admin tooling
2. Assign permissions to role (`RolePermission`)
3. Assign role to user (`UserRole`)

At runtime, `PermissionResolutionService` resolves effective permissions from all user roles.

## HTTP Status Codes

| Code | Meaning |
| ---- | ------- |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but insufficient permissions, or cross-org route param |
| 404 | Resource not found in caller's organization |

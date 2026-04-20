# FleetOps Architecture

## Overview

FleetOps is a **multi-tenant SaaS** fleet and logistics management platform. Each customer operates within an isolated **Organization** (tenant). The repository is a pnpm monorepo with a NestJS REST API, shared TypeScript packages, and Docker-based local/production deployment.

## Multi-Tenant Domain Model

All operational data is scoped to an organization. Cross-tenant access is prohibited at the application layer (scoped repository lookups return 404 for foreign resources).

```
Organization (tenant root)
├── Users, Roles, Permissions (RBAC)
├── Vehicles, Drivers, VehicleAssignments
├── Trips (+ TripEvents)
├── MaintenanceRecords (+ MaintenanceEvents)
├── Inspections
├── FuelStations, FuelRecords
├── Notifications, NotificationPreferences
├── ApiKeys, WebhookEndpoints, WebhookEvents, WebhookDeliveries
├── Jobs (background work tracking)
└── Audit events (in-memory buffer + export)
```

## Repository Structure

```
fleetops/
├── apps/
│   ├── api/                 # NestJS REST API
│   └── web/                 # Frontend (placeholder)
├── packages/
│   ├── shared-types/        # Shared TypeScript types (health, reports, DTOs)
│   ├── eslint-config/
│   └── tsconfig/
├── docs/                    # Documentation
└── docker-compose.yml       # Postgres, Redis, API
```

## Backend Architecture

The API uses modular NestJS with clear domain boundaries:

| Layer | Purpose |
| ----- | ------- |
| **Feature modules** | Domain logic (`vehicles`, `trips`, `maintenance`, etc.) |
| **Database module** | Prisma ORM via `PrismaService` |
| **Operations module** | Rate limiting, request IDs, audit export, metrics, cleanup jobs |
| **Queue module** | BullMQ workers, job records, schedulers |
| **Integrations module** | API keys, webhooks, delivery pipeline |
| **Shared layer** | Bootstrap, filters, interceptors, env validation |

### Global Guards (order of application)

1. **JwtAuthGuard** — Validates JWT on protected routes (`AuthModule`)
2. **PermissionGuard** — RBAC checks (`AuthorizationModule`)
3. **IpThrottlerGuard** — Rate limiting (`OperationsModule`)

Public routes (health, auth login/register, API-key context) bypass JWT via `@Public()`.

### API Versioning

All HTTP routes use the global prefix `/api/v1`. Swagger UI is at `/docs` (unversioned).

### Request Lifecycle

1. `RequestIdMiddleware` assigns/propagates `X-Request-Id`
2. Guards authenticate and authorize
3. Controller delegates to service
4. Service uses org-scoped repositories
5. Side effects (audit, webhooks, notifications) run after successful DB writes
6. `LoggingInterceptor` and `AllExceptionsFilter` handle observability

## Data & Infrastructure

| Component | Technology |
| --------- | ---------- |
| Runtime | Node.js 20+ |
| Framework | NestJS |
| ORM | Prisma 6 |
| Database | PostgreSQL 16 |
| Queue | BullMQ + Redis 7 |
| API docs | Swagger/OpenAPI |

### Transactions

Multi-step lifecycle operations use Prisma `$transaction` where atomicity matters:

- **Trips** — status update + trip event in one transaction
- **Maintenance** — status update + maintenance event + optional vehicle status sync

Audit logging, webhooks, and notifications remain post-transaction to preserve existing delivery semantics.

### Partial Unique Indexes

PostgreSQL partial indexes enforce fleet invariants (documented in `apps/api/prisma/PARTIAL_INDEXES.md`):

- One active vehicle assignment per vehicle/driver
- One in-progress maintenance record per vehicle

## Module Map

```
apps/api/src/
├── organizations/          # Tenant root
├── auth/                   # JWT, refresh tokens, login/register
├── users/                  # User CRUD
├── roles/                  # Org-scoped roles
├── permissions/            # Global permissions + resolution
├── authorization/          # PermissionGuard, decorators
├── vehicles/               # Fleet vehicles
├── drivers/                # Drivers
├── vehicle-assignments/    # Driver–vehicle assignments
├── trips/                  # Trip lifecycle
├── maintenance/            # Maintenance lifecycle
├── inspections/            # Vehicle inspections
├── fuel/                   # Fuel records and stations
├── notifications/          # In-app notifications
├── reports/                # Analytics and reports
├── integrations/           # API keys, webhooks
├── queues/                 # BullMQ jobs and workers
├── fleet/                  # Shared audit service
├── operations/             # Ops hardening (rate limit, metrics, cleanup)
├── health/                 # Health checks
└── shared/                 # Cross-cutting utilities
```

## Related Documentation

- [Authentication](./authentication.md)
- [Authorization](./authorization.md)
- [Deployment](./deployment.md)
- [Testing](./testing.md)

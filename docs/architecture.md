# FleetOps Architecture

## Overview

FleetOps is a **multi-tenant SaaS** fleet and logistics management platform. Each customer operates within an isolated **Organization** (tenant). The repository is organized as a pnpm monorepo with deployable applications and shared packages.

## Multi-Tenant Domain Model

All operational data is scoped to an organization. The planned domain hierarchy:

```
Organization (tenant root)
├── Users
├── Roles & Permissions (RBAC, org-scoped)
├── Vehicles
├── Drivers
├── Trips
├── Maintenance
├── Fuel records
├── Inspections
├── Notifications
├── Audit logs
├── Reports
├── API keys
└── Webhooks
```

Future Prisma models will include `organizationId` (or equivalent tenant foreign keys) on tenant-owned entities. Cross-tenant access is prohibited at the application and database policy layers.

## Repository Structure

```
fleetops/
├── apps/
│   ├── api/          # NestJS REST API (primary backend)
│   └── web/          # Frontend (placeholder)
├── packages/
│   ├── shared-types/ # Cross-package TypeScript types
│   ├── eslint-config/# Shared ESLint configuration
│   └── tsconfig/     # Shared TypeScript configuration
└── docs/             # Project documentation
```

## Backend Architecture

The API follows a modular NestJS architecture:

- **Feature modules** — Domain boundaries aligned to the tenant model (`organizations`, `auth`, `users`, `roles`, etc.)
- **Database module** — Prisma ORM integration via `PrismaService`
- **Shared layer** — Cross-cutting concerns (bootstrap, filters, guards, interceptors, DTOs)
- **Health module** — Operational readiness endpoint

### API Versioning

All HTTP routes are served under a global prefix:

```
/api/v1
```

Example: `GET /api/v1/health`

Swagger UI remains at `/docs` (unversioned). New breaking API changes will introduce `/api/v2` alongside v1.

### Module Layout

```
apps/api/src/
├── organizations/  # Tenant root (scaffold)
├── auth/           # Authentication (scaffold)
├── users/          # User management (scaffold)
├── roles/          # RBAC (scaffold)
├── database/       # Prisma integration
├── health/         # Health check
├── shared/         # Cross-cutting concerns
│   └── bootstrap/  # Shared app configuration
└── main.ts
```

## Authentication Configuration (Planned)

Environment variables are validated at startup (placeholders until auth is implemented):

| Variable                 | Purpose                          |
| ------------------------ | -------------------------------- |
| `JWT_SECRET`             | Signing key for access tokens    |
| `JWT_ACCESS_EXPIRES_IN`  | Access token lifetime (e.g. 15m) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. 7d) |

Production deployments must replace the development placeholder `JWT_SECRET`.

## Database & Migrations

- **ORM:** Prisma with PostgreSQL 16
- **Migrations:** Stored under `apps/api/prisma/migrations/`
- **Commit policy:** All migration files **including** `migration_lock.toml` are version-controlled
- **Seeding:** Ordered seeders in `prisma/seeds/` — organizations first, then RBAC, then domain data

## Technology Stack

| Layer     | Technology       |
| --------- | ---------------- |
| Runtime   | Node.js 20+      |
| Framework | NestJS           |
| ORM       | Prisma           |
| Database  | PostgreSQL 16    |
| API Docs  | Swagger/OpenAPI  |
| Testing   | Jest + Supertest |

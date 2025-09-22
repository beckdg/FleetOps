# FleetOps Architecture

## Overview

FleetOps is a monorepo-based fleet and logistics management platform. The repository is organized into deployable applications and shared packages.

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

- **Feature modules** — Domain boundaries (`auth`, `users`, `roles`, etc.)
- **Database module** — Prisma ORM integration via `PrismaService`
- **Shared layer** — Cross-cutting concerns (filters, guards, interceptors, DTOs)
- **Health module** — Operational readiness endpoint

Future domain modules (vehicles, drivers, trips, maintenance, fuel, inspections, notifications, audit logs, reports, API keys, webhooks) will follow the same module pattern.

## Technology Stack

| Layer      | Technology        |
| ---------- | ----------------- |
| Runtime    | Node.js 20+       |
| Framework  | NestJS            |
| ORM        | Prisma            |
| Database   | PostgreSQL 16     |
| API Docs   | Swagger/OpenAPI   |
| Testing    | Jest + Supertest  |

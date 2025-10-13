# FleetOps

Fleet and logistics management platform for companies managing users, vehicles, drivers, trips, maintenance, fuel records, inspections, and more.

## Monorepo Structure

```
fleetops/
├── apps/
│   ├── api/                 # NestJS REST API
│   └── web/                 # Frontend (placeholder)
├── packages/
│   ├── shared-types/        # Shared TypeScript types
│   ├── eslint-config/       # Shared ESLint rules
│   └── tsconfig/            # Shared TypeScript configs
├── docs/                    # Documentation
└── docker-compose.yml       # Local Docker stack
```

## Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [pnpm](https://pnpm.io/) 9+
- [Docker](https://www.docker.com/) (optional, for containerized setup)
- PostgreSQL 16 (if running API locally without Docker)

## Local Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

Copy the example environment file and adjust values as needed:

```bash
cp apps/api/.env.example apps/api/.env
```

### 3. Start PostgreSQL

Using Docker:

```bash
docker compose up postgres -d
```

Or use a local PostgreSQL 16 instance and update `DATABASE_URL` accordingly.

Docker Compose maps PostgreSQL to host port **5433** (to avoid conflicts with a local Postgres on 5432). Use the URLs in `apps/api/.env.example`.

### 4. Apply migrations and seed (optional)

```bash
pnpm --filter @fleetops/api prisma:migrate:deploy
pnpm --filter @fleetops/api prisma:seed
```

### 5. Generate Prisma client

```bash
pnpm --filter @fleetops/api prisma:generate
```

### 6. Start the API in development mode

```bash
pnpm start:dev
```

The API will be available at `http://localhost:3000`.

Swagger documentation: `http://localhost:3000/docs`

API base path: `http://localhost:3000/api/v1`

Health check: `http://localhost:3000/api/v1/health`

## Environment Variables

| Variable                 | Description                          | Default       |
| ------------------------ | ------------------------------------ | ------------- |
| `NODE_ENV`               | Runtime environment                  | `development` |
| `PORT`                   | HTTP port for the API                | `3000`        |
| `DATABASE_URL`           | PostgreSQL connection string         | *(required)*  |
| `DATABASE_URL_TEST`      | PostgreSQL for integration tests     | *(optional)*  |
| `JWT_SECRET`             | JWT signing secret (min 32 chars)    | dev placeholder |
| `JWT_ACCESS_EXPIRES_IN`  | Access token expiry                  | `15m`         |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token expiry                 | `7d`          |

See `apps/api/.env.example` for a complete example.

## Running with Docker

Start the full stack (API + PostgreSQL):

```bash
docker compose up --build
```

Start only PostgreSQL for local API development:

```bash
docker compose up postgres -d
```

## Development Workflow

### Available Scripts

| Command          | Description                    |
| ---------------- | ------------------------------ |
| `pnpm build`     | Build all packages             |
| `pnpm lint`      | Lint all packages              |
| `pnpm test`      | Run unit tests                 |
| `pnpm test:e2e`  | Run API end-to-end tests       |
| `pnpm --filter @fleetops/api test:integration` | Run API integration tests (requires Postgres) |
| `pnpm start:dev` | Start API with hot reload      |

### Code Quality

This project uses:

- **ESLint** — Static analysis
- **Prettier** — Code formatting
- **Husky** — Git hooks
- **lint-staged** — Pre-commit linting and formatting

Pre-commit hooks run automatically after `pnpm install` via the `prepare` script.

### API Module Structure

```
apps/api/src/
├── organizations/  # Tenant root
├── users/          # User management
├── roles/          # Role assignment
├── permissions/    # Permissions and resolution
├── database/       # Prisma integration
├── health/         # Health check endpoint
├── shared/         # Cross-cutting concerns
│   └── bootstrap/  # Shared HTTP app configuration
└── main.ts         # Application bootstrap
```

All routes are versioned under `/api/v1`. Future domain modules (vehicles, drivers, trips, maintenance, fuel, inspections, notifications, audit logs, reports, API keys, webhooks) will be organization-scoped and follow the same module pattern.

## Testing

```bash
# Unit tests
pnpm test

# End-to-end tests
pnpm test:e2e

# Integration tests (Postgres on port 5433; see DATABASE_URL_TEST)
pnpm --filter @fleetops/api test:integration
```

## License

Proprietary — All rights reserved.

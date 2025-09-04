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

### 4. Generate Prisma client

```bash
pnpm --filter @fleetops/api prisma:generate
```

### 5. Start the API in development mode

```bash
pnpm start:dev
```

The API will be available at `http://localhost:3000`.

Swagger documentation: `http://localhost:3000/docs`

Health check: `http://localhost:3000/health`

## Environment Variables

| Variable       | Description                          | Default       |
| -------------- | ------------------------------------ | ------------- |
| `NODE_ENV`     | Runtime environment                  | `development` |
| `PORT`         | HTTP port for the API                | `3000`        |
| `DATABASE_URL` | PostgreSQL connection string         | *(required)*  |

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
├── auth/           # Authentication (scaffold)
├── users/          # User management (scaffold)
├── roles/          # RBAC (scaffold)
├── database/       # Prisma integration
├── health/         # Health check endpoint
├── shared/         # Cross-cutting concerns
└── main.ts         # Application bootstrap
```

Future modules (vehicles, drivers, trips, maintenance, fuel, inspections, notifications, audit logs, reports, API keys, webhooks) will be added following the same pattern.

## Testing

```bash
# Unit tests
pnpm test

# End-to-end tests
pnpm test:e2e
```

## License

Proprietary — All rights reserved.

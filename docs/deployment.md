# Deployment

This guide covers local development, Docker deployment, database migrations, and production configuration.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16
- Redis 7 (required for queues)
- Docker (optional)

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp apps/api/.env.example apps/api/.env
```

### 3. Start infrastructure

```bash
docker compose up postgres redis -d
```

Docker Compose maps PostgreSQL to host port **5433** (avoids conflict with local Postgres on 5432).

### 4. Database setup

```bash
pnpm --filter @fleetops/api prisma:generate
pnpm --filter @fleetops/api prisma:migrate:deploy
pnpm --filter @fleetops/api prisma:seed   # optional demo data
```

### 5. Run API

```bash
pnpm start:dev
```

| URL | Description |
| --- | ----------- |
| `http://localhost:3000/api/v1/health` | Health check |
| `http://localhost:3000/docs` | Swagger UI |

## Docker Full Stack

```bash
docker compose up --build
```

Services:

| Service | Port | Description |
| ------- | ---- | ----------- |
| `postgres` | 5433→5432 | PostgreSQL 16 |
| `redis` | 6379 | Redis 7 |
| `api` | 3000 | NestJS API (production build) |

The API container waits for Postgres and Redis health checks before starting.

### API Dockerfile

Multi-stage build:

1. Install dependencies and build shared types + API
2. `pnpm deploy --prod` for minimal runtime image
3. Non-root `nestjs` user
4. Built-in Docker `HEALTHCHECK` against `/api/v1/health`

**Note:** Run migrations separately before or during deploy — the container CMD does not auto-migrate.

## Environment Variables

### Required

| Variable | Description |
| -------- | ----------- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing key (min 32 chars) |

### Infrastructure

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `NODE_ENV` | `development` | `development`, `production`, `test` |
| `PORT` | `3000` | HTTP port |
| `REDIS_URL` | `redis://localhost:6379` | Redis for BullMQ |
| `APP_VERSION` | `0.1.0` | Reported in health check |

### Auth

| Variable | Default |
| -------- | ------- |
| `JWT_ACCESS_EXPIRES_IN` | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | `7d` |
| `ACCOUNT_LOCKOUT_MAX_ATTEMPTS` | `5` |
| `ACCOUNT_LOCKOUT_DURATION_MINUTES` | `15` |

### Rate Limiting

| Variable | Default |
| -------- | ------- |
| `RATE_LIMIT_AUTH_TTL_MS` | `60000` |
| `RATE_LIMIT_AUTH_LIMIT` | `20` |
| `RATE_LIMIT_API_KEY_TTL_MS` | `60000` |
| `RATE_LIMIT_API_KEY_LIMIT` | `60` |
| `RATE_LIMIT_WEBHOOK_TTL_MS` | `60000` |
| `RATE_LIMIT_WEBHOOK_LIMIT` | `30` |

### Retention

| Variable | Default |
| -------- | ------- |
| `REFRESH_TOKEN_RETENTION_DAYS` | `30` |
| `COMPLETED_JOB_RETENTION_DAYS` | `90` |
| `AUDIT_BUFFER_SIZE` | `10000` |

All variables are validated at startup via Joi (`env.validation.ts`). Invalid config aborts boot.

## Migrations

Migrations live in `apps/api/prisma/migrations/`. Always commit migration files including `migration_lock.toml`.

```bash
# Apply pending migrations (production)
pnpm --filter @fleetops/api prisma:migrate:deploy

# Create new migration (development)
pnpm --filter @fleetops/api prisma:migrate:dev
```

## Seeding

Ordered seeders in `apps/api/prisma/seeds/index.ts`:

1. Organizations → Permissions → Roles → Role-permissions
2. Vehicles, drivers, demo fleet setup (admin + dispatcher)
3. Trips, maintenance, inspections, fuel
4. Notifications, integrations, reminder demo data

Demo credentials documented in root `README.md`.

## Production Checklist

- [ ] Set strong `JWT_SECRET` (not dev placeholder)
- [ ] Set `NODE_ENV=production`
- [ ] Run `prisma migrate deploy` before traffic
- [ ] Ensure Redis is available and reachable
- [ ] Configure reverse proxy with TLS
- [ ] Enable `trust proxy` (already set in `main.ts`)
- [ ] Monitor `/api/v1/health` and `/api/v1/queues/health`
- [ ] Restrict Postgres/Redis network access

## CI

GitHub Actions runs lint, build, unit tests (with coverage thresholds), and integration tests against a PostgreSQL service container. See `.github/workflows/ci.yml` and [Testing](./testing.md).

## Related Documentation

- [Architecture](./architecture.md)
- [Troubleshooting](./troubleshooting.md)

# FleetOps Testing Guide

This document describes how tests are organized, how to run them locally, and how CI enforces quality gates.

## Test layers

| Layer | Location | Config | Database |
| ----- | -------- | ------ | -------- |
| **Unit** | `apps/api/src/**/*.spec.ts` | `apps/api/jest.config.ts` | No |
| **Integration** | `apps/api/test/integration/**/*.integration.spec.ts` | `apps/api/test/jest-integration.json` | PostgreSQL (required) |
| **E2E** | `apps/api/test/**/*.e2e-spec.ts` | `apps/api/test/jest-e2e.json` | No (Prisma mocked in health e2e) |

Integration tests bootstrap NestJS modules or the full HTTP app (`HttpAppModule`) against a real database. HTTP integration suites use Supertest with production controllers.

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 16 for integration tests

### Local PostgreSQL

Docker Compose exposes PostgreSQL on host port **5433**:

```bash
docker compose up postgres -d
```

Set test connection strings in `apps/api/.env` (see `.env.example`):

```env
DATABASE_URL_TEST=postgresql://fleetops:fleetops@localhost:5433/fleetops_test?schema=public
```

Integration setup reads `DATABASE_URL_TEST` when present, otherwise falls back to the default local URL on port 5433.

## Commands

From the repository root:

```bash
# Lint all packages
pnpm lint

# Build all packages
pnpm build

# Unit tests with coverage enforcement
pnpm test
pnpm test:cov

# API integration tests (requires Postgres)
pnpm test:integration

# API e2e tests
pnpm test:e2e
```

From `apps/api`:

```bash
pnpm test              # unit tests + coverage thresholds
pnpm test:cov          # same as test
pnpm test:integration  # integration suite (runInBand)
pnpm test:watch        # unit tests in watch mode
```

## Coverage thresholds

Unit tests collect coverage from `apps/api/src` (excluding `*.spec.ts`). Jest **fails the run** if global coverage drops below:

| Metric | Minimum |
| ------ | ------- |
| Statements | 18% |
| Branches | 16% |
| Functions | 12% |
| Lines | 17% |

Thresholds are defined in `apps/api/jest.config.ts`. Raise them incrementally as unit coverage improves.

Coverage output is written to `apps/api/coverage/`:

| File | Purpose |
| ---- | ------- |
| `lcov.info` | IDE / Sonar / Codecov ingestion |
| `coverage-summary.json` | Quick numeric summary |
| `coverage-final.json` | Full Istanbul JSON report |
| `cobertura-coverage.xml` | CI tools expecting Cobertura XML |

The `coverage/` directory is gitignored.

## Integration test lifecycle

1. `setup-integration.ts` loads env and sets `DATABASE_URL` from `DATABASE_URL_TEST`.
2. `global-setup.ts` recreates the `public` schema and runs `prisma migrate deploy`.
3. Each spec calls `resetDatabase()` in `beforeEach` to truncate tables in dependency order.

Integration tests run **serially** (`--runInBand`) to avoid database contention.

## Continuous integration

GitHub Actions workflow: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)

| Job | Purpose |
| --- | ------- |
| **Lint** | `pnpm lint`, `pnpm format:check` |
| **Build** | Shared types, Prisma generate, API build |
| **Unit tests** | `pnpm --filter @fleetops/api test:cov` (coverage thresholds enforced), e2e, coverage artifact upload |
| **Integration tests** | PostgreSQL 16 service container, `pnpm test:integration` |

Integration job environment:

```text
DATABASE_URL=postgresql://fleetops:fleetops@localhost:5432/fleetops_test?schema=public
DATABASE_URL_TEST=postgresql://fleetops:fleetops@localhost:5432/fleetops_test?schema=public
```

The job waits for `pg_isready` before running tests. Migrations are applied by integration `global-setup`, not a separate CI step.

### Coverage artifacts

Failed or successful unit test runs upload **`unit-coverage`** artifacts (retained 14 days) containing LCOV, JSON summary, and Cobertura XML. Download from the GitHub Actions run summary.

## Troubleshooting

**Integration tests cannot connect to PostgreSQL**

- Ensure Docker Postgres is running: `docker compose up postgres -d`
- Confirm `DATABASE_URL_TEST` points to port **5433** locally (5432 in CI)
- Check nothing else is bound to the expected port

**Coverage threshold failures**

- Run `pnpm --filter @fleetops/api test:cov` locally and inspect the table output
- Add or extend unit tests under `apps/api/src/**/*.spec.ts`
- Do not lower thresholds without team agreement

**Prisma client out of date**

```bash
pnpm --filter @fleetops/api prisma:generate
```

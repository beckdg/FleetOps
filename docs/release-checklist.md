# Release Checklist

Use this checklist before tagging a release, submitting the repository, or deploying to production.

## Build Verification

- [ ] `pnpm install --frozen-lockfile` completes without errors
- [ ] `pnpm --filter @fleetops/shared-types build` succeeds
- [ ] `pnpm --filter @fleetops/api prisma:generate` succeeds
- [ ] `pnpm build` succeeds with no TypeScript errors

## Unit Tests

- [ ] `pnpm test` passes
- [ ] Coverage meets thresholds in `apps/api/jest.config.ts`

## Integration Tests

- [ ] PostgreSQL available on `DATABASE_URL_TEST` (default port 5433)
- [ ] Redis available for queue integration tests
- [ ] `pnpm test:integration` passes

## Database

- [ ] `pnpm --filter @fleetops/api prisma:migrate:deploy` applies cleanly on empty database
- [ ] `pnpm --filter @fleetops/api prisma:migrate:deploy` is idempotent on existing database
- [ ] `pnpm --filter @fleetops/api prisma:seed` completes (optional demo data)
- [ ] Demo login works: `admin@fleetops-demo.test` / `DemoPassword123!` (org: `fleetops-demo`)

## Docker Verification

- [ ] `docker compose build` succeeds
- [ ] `docker compose up -d` starts postgres, redis, and api
- [ ] API container does **not** crash with Prisma client errors
- [ ] Migrations apply automatically on container start
- [ ] `curl http://localhost:3000/api/v1/health` returns `"status":"ok"` (or `"degraded"` only if a dependency is down)
- [ ] Swagger available at `http://localhost:3000/docs`

## Documentation

- [ ] `docs/architecture.md` reflects current modules
- [ ] `docs/deployment.md` environment variables are accurate
- [ ] `docs/release-packaging.md` instructions tested
- [ ] Root `README.md` demo credentials and setup steps are current
- [ ] Swagger `/docs` loads and documents auth + integrations

## Release Package

- [ ] Git working tree is clean
- [ ] `./scripts/create-release-package.ps1` or `./scripts/create-release-package.sh` succeeds
- [ ] ZIP created under `release/`
- [ ] SHA256 checksum file generated and verified
- [ ] Extracted package: `pnpm install`, `pnpm build`, and `pnpm test` succeed

## Repository History

- [ ] Commit history spans the intended timeline (Sep 2025 – Apr 2026)
- [ ] Commit count meets project requirements (>120)
- [ ] Backup tag available if history was rewritten (`history-backup-before-rewrite`)
- [ ] No secrets committed (`.env`, credentials, production JWT secrets)

## Production Readiness (Pre-Go-Live)

- [ ] `JWT_SECRET` changed from development/docker placeholders
- [ ] `NODE_ENV=production` set in deployment environment
- [ ] Postgres and Redis credentials rotated from defaults
- [ ] Rate limits and lockout settings reviewed (`env.validation.ts`)
- [ ] Health and queue endpoints monitored
- [ ] Backup and restore procedure documented for PostgreSQL

## Sign-Off

| Role | Name | Date | Notes |
| ---- | ---- | ---- | ----- |
| Engineering | | | |
| QA | | | |
| DevOps | | | |

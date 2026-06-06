# Release Packaging

FleetOps release packages are self-contained source archives intended for submission, audit, or offline deployment preparation. Each package includes the full Git history (`.git/`) while omitting regenerable artifacts.

## Create a Release ZIP

### Windows (PowerShell)

```powershell
./scripts/create-release-package.ps1
```

Options:

| Flag | Description |
| ---- | ----------- |
| `-SkipTests` | Skip `pnpm test` |
| `-SkipBuild` | Skip `pnpm build` |
| `-OutputDir release` | Output directory (default: `release/`) |

### Linux / macOS

```bash
chmod +x scripts/create-release-package.sh
./scripts/create-release-package.sh
```

Options: `--skip-tests`, `--skip-build`, `--output-dir DIR`

## Preconditions

The script **requires a clean Git working tree** (no uncommitted changes). Commit or stash changes before packaging.

The script will:

1. Verify `git status` is clean
2. Run `pnpm build`
3. Run `pnpm test` (unless skipped)
4. Copy the repository excluding `node_modules`, `dist`, `build`, `coverage`, and similar artifacts
5. Include the entire `.git` directory
6. Write `release/fleetops-release-<version>-<timestamp>.zip`
7. Write a `.sha256` checksum file alongside the ZIP

## Verify the Checksum

### Windows

```powershell
Get-FileHash -Algorithm SHA256 release/fleetops-release-*.zip
# Compare with the contents of the matching .sha256 file
```

### Linux / macOS

```bash
sha256sum -c release/fleetops-release-*.zip.sha256
```

## Run After Extraction

1. Extract the ZIP to a directory of your choice.

2. Install dependencies:

   ```bash
   pnpm install --frozen-lockfile
   ```

3. Configure environment:

   ```bash
   cp apps/api/.env.example apps/api/.env
   # Edit DATABASE_URL (port 5433 for Docker Compose Postgres on host)
   ```

4. Generate Prisma client and apply migrations:

   ```bash
   pnpm --filter @fleetops/api prisma:generate
   pnpm --filter @fleetops/api prisma:migrate:deploy
   ```

5. Optional seed:

   ```bash
   pnpm --filter @fleetops/api prisma:seed
   ```

6. Start the API:

   ```bash
   pnpm start:dev
   ```

## Required Environment Variables

See `apps/api/.env.example` and `apps/api/src/shared/constants/env.validation.ts`.

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `REDIS_URL` | Yes | Redis URL for BullMQ queues |
| `JWT_SECRET` | Yes | Min 32 characters; must not be dev placeholder in production |
| `NODE_ENV` | No | `development`, `production`, or `test` |
| `PORT` | No | HTTP port (default `3000`) |

For Docker Compose, copy `.env.docker.example` to `.env.docker` and adjust secrets before production use.

## Docker Deployment

### Quick start

```bash
cp .env.docker.example .env.docker   # optional overrides
docker compose up -d --build
```

Services:

| Service | Host port | Description |
| ------- | --------- | ----------- |
| `postgres` | 5433 | PostgreSQL 16 |
| `redis` | 6379 | Redis 7 |
| `api` | 3000 | NestJS API |

The API container:

1. Runs `prisma migrate deploy` on startup (disable with `RUN_MIGRATIONS=false`)
2. Starts the NestJS application on port 3000

### Health check

```bash
curl http://localhost:3000/api/v1/health
```

Swagger: `http://localhost:3000/docs`

### Optional seed (first run)

```bash
docker compose exec api prisma db seed
```

Note: seed requires `ts-node` which is not included in the production image. Run seeds from the host against the exposed Postgres port, or use a development container.

### Production notes

- Replace `JWT_SECRET` and database credentials in `.env.docker`
- Use TLS termination via a reverse proxy
- Pin image tags and run migrations before traffic when using external orchestration
- Set `RUN_MIGRATIONS=false` if migrations are handled by a separate job

See [deployment.md](./deployment.md) and [release-checklist.md](./release-checklist.md).

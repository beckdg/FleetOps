# Troubleshooting

Common issues when developing, testing, and deploying FleetOps.

## Database Connection

### Symptom

```
Can't reach database server at `localhost:5433`
PrismaClientInitializationError: P1001
```

### Fixes

1. Start Postgres: `docker compose up postgres -d`
2. Verify `DATABASE_URL` in `apps/api/.env` matches Docker port **5433**
3. Check container health: `docker compose ps`
4. Test connection: `pnpm --filter @fleetops/api prisma validate`

Integration tests use `DATABASE_URL_TEST` (defaults to `fleetops_test` database on same port).

## Redis / Queue Issues

### Symptom

Health check shows `queues` degraded or workers not processing jobs.

### Fixes

1. Start Redis: `docker compose up redis -d`
2. Verify `REDIS_URL=redis://localhost:6379`
3. Check queue health: `GET /api/v1/queues/health` (requires auth + `jobs:read`)
4. Review API logs for BullMQ connection errors

Jobs remain in `PENDING` status if Redis is unavailable at enqueue time.

## Authentication Failures

### 401 Invalid credentials

- Confirm `organizationSlug`, email, and password
- Demo: `fleetops-demo` / `admin@fleetops-demo.test` / `DemoPassword123!`
- Run seed if demo user missing: `pnpm --filter @fleetops/api prisma:seed`

### 401 after 5 failed logins

Account lockout active. Wait 15 minutes (default) or reset user in database:

```sql
UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE email = '...';
```

### 401 Invalid or expired refresh token

Refresh token was revoked (logout) or expired. Re-login to obtain new tokens.

### JWT_SECRET validation error on startup

Production rejects the dev placeholder secret. Set a unique 32+ character `JWT_SECRET`.

## Authorization Failures

### 403 Insufficient permissions

User lacks required `resource:action` permission. Assign via role or use admin user.

Admin role (`admin`) bypasses permission checks within the organization.

### 403 Cross-organization access denied

Route parameter organization ID does not match JWT organization. Use resources from your own tenant.

### 404 on valid-looking resource ID

Resource belongs to another organization. FleetOps returns 404 (not 403) for cross-tenant access.

## Maintenance Conflicts

### 409 Vehicle already has maintenance in progress

Only one `IN_PROGRESS` maintenance per vehicle. Complete or cancel existing work before starting new maintenance on the same vehicle.

## Vehicle Assignment Conflicts

### 409 assignment conflict

One active assignment per vehicle and per driver. End existing assignment before creating a new one.

## Trip Validation Errors

### Vehicle in maintenance

Cannot create or start trips while vehicle status is `IN_MAINTENANCE`. Complete or cancel maintenance first.

### Schedule overlap

Active trips for the same vehicle or driver have overlapping scheduled windows. Adjust times or cancel conflicting trips.

## Webhook Delivery Failures

Check delivery history:

```
GET /api/v1/webhook-deliveries?webhookEndpointId=<id>
```

Common causes:

- Invalid URL or TLS certificate
- Receiver not verifying signature correctly
- Receiver returning non-2xx status (retries up to 3 times)

Signature header: `X-FleetOps-Signature`

## API Key Issues

### Invalid API key format

Keys must start with `fleetops_live_`.

### API key has been revoked / expired

Create a new key via `POST /api/v1/api-keys`. Plaintext is only shown at creation.

## Build & Test Failures

### Prisma client out of date

```bash
pnpm --filter @fleetops/api prisma:generate
```

### Integration tests fail at globalSetup

Postgres not running or `DATABASE_URL_TEST` misconfigured. See [Testing](./testing.md).

### Unit test coverage threshold failure

Coverage thresholds in `apps/api/jest.config.ts` — add meaningful tests or adjust thresholds deliberately.

## Health Check Reference

`GET /api/v1/health` returns:

```json
{
  "status": "ok" | "degraded",
  "service": "FleetOps API",
  "version": "0.1.0",
  "uptimeSeconds": 123,
  "checks": {
    "database": { "connected": true, "latencyMs": 2 },
    "redis": { "connected": true, "latencyMs": 1 },
    "queues": { "queues": [ ... ] }
  }
}
```

`degraded` means one or more checks failed — inspect `checks` for details.

## Request Tracing

Every response includes `X-Request-Id`. Include this header value when reporting errors.

## Logs

Structured request logging via `LoggingInterceptor`. Unhandled exceptions formatted by `AllExceptionsFilter` with request ID.

## Getting Help

1. Check health endpoint and environment variables
2. Verify Postgres + Redis connectivity
3. Confirm seed data and demo credentials
4. Review Swagger at `/docs` for endpoint requirements
5. See [Deployment](./deployment.md) for production checklist

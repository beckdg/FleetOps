# Authentication

FleetOps supports two authentication mechanisms:

1. **JWT (users)** — Primary auth for the web app and internal API clients
2. **API keys (integrations)** — Machine-to-machine access for external connectors

## User Authentication (JWT)

### Endpoints

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| POST | `/api/v1/auth/register` | Public | Register a user in an organization |
| POST | `/api/v1/auth/login` | Public | Obtain access + refresh tokens |
| POST | `/api/v1/auth/refresh` | Public | Rotate refresh token, get new access token |
| POST | `/api/v1/auth/logout` | Public | Revoke refresh token |
| GET | `/api/v1/auth/me` | Bearer JWT | Current user profile |

### Login Flow

1. Client sends `organizationSlug`, `email`, and `password`
2. Server validates organization is active
3. Server validates user exists, is active, and password matches (bcrypt)
4. Failed attempts increment `failedLoginAttempts`; account locks after threshold
5. On success, server issues JWT access token + opaque refresh token

### Token Pair

| Token | Storage | Lifetime (default) |
| ----- | ------- | ------------------ |
| Access token | Client memory / header | `15m` (`JWT_ACCESS_EXPIRES_IN`) |
| Refresh token | Secure client storage | `7d` (`JWT_REFRESH_EXPIRES_IN`) |

Access tokens are sent as:

```
Authorization: Bearer <access-token>
```

JWT payload includes `userId`, `organizationId`, and `roleIds`.

### Refresh Token Rotation

Refresh tokens are stored hashed in the database. On refresh:

1. Old token is validated and revoked atomically
2. New refresh token is issued
3. New access token is signed
4. Login lockout counters are reset

### Registration

New users register against an existing organization slug. The default role (`driver`) is assigned automatically unless configured otherwise in `auth.constants.ts`.

### Account Lockout

Configurable via environment variables:

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `ACCOUNT_LOCKOUT_MAX_ATTEMPTS` | 5 | Failed logins before lock |
| `ACCOUNT_LOCKOUT_DURATION_MINUTES` | 15 | Lock duration |

Lockout state is stored on the user record (`failedLoginAttempts`, `lockedUntil`). Failed attempts are recorded atomically in a transaction.

### Rate Limiting

Auth endpoints (`/auth/login`, `/auth/register`, `/auth/refresh`) are rate-limited separately from general API traffic. Defaults: 20 requests per 60 seconds per IP (`RATE_LIMIT_AUTH_*`).

## API Key Authentication

Used for the public integration context endpoint and future machine clients.

### Endpoint

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/api/v1/integrations/context` | API key | Resolve organization from key |

### Usage

```
Authorization: Bearer fleetops_live_<plaintext-key>
```

Keys are prefixed with `fleetops_live_`. The server hashes the token with SHA-256 and looks up the record. Revoked or expired keys are rejected.

API key routes use `ApiKeyGuard` instead of JWT. Rate limit profile: 60 requests / 60s per IP (`RATE_LIMIT_API_KEY_*`).

### Key Lifecycle

- Created via `POST /api/v1/api-keys` (requires JWT + `integrations:write`)
- Plaintext key returned once at creation
- Revoked via `DELETE /api/v1/api-keys/:id`
- Expired keys auto-revoked by daily cleanup job

See [Integrations](./integrations.md) for management endpoints.

## Environment Variables

| Variable | Required | Description |
| -------- | -------- | ----------- |
| `JWT_SECRET` | Yes | Signing key (min 32 chars; must not be dev placeholder in production) |
| `JWT_ACCESS_EXPIRES_IN` | No | Access token TTL (e.g. `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token TTL (e.g. `7d`) |

## Demo Credentials

After seeding (`pnpm --filter @fleetops/api prisma:seed`):

| Email | Password | Organization slug |
| ----- | -------- | ----------------- |
| `admin@fleetops-demo.test` | `DemoPassword123!` | `fleetops-demo` |

## Security Notes

- Generic `Invalid credentials` message on login failure (no user enumeration)
- Production rejects the development JWT placeholder secret at startup
- `trust proxy` is enabled for correct client IP behind reverse proxies
- Refresh tokens are never stored in plaintext

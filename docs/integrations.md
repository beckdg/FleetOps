# Integrations

FleetOps integrations enable external systems to receive events (webhooks) and authenticate (API keys).

## API Keys

Organization-scoped keys for machine-to-machine access.

### Endpoints

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| POST | `/api/v1/api-keys` | `integrations:write` | Create key (plaintext returned once) |
| GET | `/api/v1/api-keys` | `integrations:read` | List keys (no plaintext) |
| DELETE | `/api/v1/api-keys/:id` | `integrations:write` | Revoke key |
| GET | `/api/v1/integrations/context` | API key | Resolve org context (public + ApiKeyGuard) |

### Key Format

```
fleetops_live_<random-secret>
```

Only a SHA-256 hash is stored. Prefix `fleetops_live_` identifies API key tokens vs JWTs.

### Key Fields

| Field | Description |
| ----- | ----------- |
| `name` | Human-readable label |
| `keyPrefix` | First chars for identification |
| `isActive` | False when revoked |
| `expiresAt` | Optional expiration |
| `lastUsedAt` | Updated on each successful auth |

Revocation uses org-scoped `updateMany` to prevent cross-tenant TOCTOU issues.

### Authentication

```
GET /api/v1/integrations/context
Authorization: Bearer fleetops_live_...
```

Response:

```json
{
  "organizationId": "...",
  "apiKeyId": "..."
}
```

Documented in Swagger under the `api-key` security scheme.

## Webhooks

### Endpoints

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| POST | `/api/v1/webhooks` | `integrations:write` | Register endpoint |
| GET | `/api/v1/webhooks` | `integrations:read` | List endpoints |
| PATCH | `/api/v1/webhooks/:id` | `integrations:write` | Update endpoint |
| GET | `/api/v1/webhook-deliveries` | `integrations:read` | Delivery history |

Webhook updates use org-scoped queries to prevent cross-tenant modification.

### Webhook Endpoint

| Field | Description |
| ----- | ----------- |
| `name` | Label |
| `url` | HTTPS destination |
| `secret` | Signing secret (stored hashed) |
| `isActive` | Enable/disable delivery |

### Event Types

| Event | Trigger |
| ----- | ------- |
| `trip.created` | Trip created |
| `trip.started` | Trip started |
| `trip.completed` | Trip completed |
| `maintenance.started` | Maintenance started |
| `maintenance.completed` | Maintenance completed |
| `inspection.failed` | Inspection failed |
| `fuel.record.created` | Fuel record created |

## Delivery Pipeline

1. Domain service calls `WebhookPublisherService.publish`
2. `WebhookEvent` record created
3. For each active endpoint, delivery job enqueued on `webhook-delivery` queue
4. Worker signs payload and POSTs to endpoint URL
5. Delivery result stored (`WebhookDelivery` — status, attempt count, response)

### Signature

Requests include header `X-FleetOps-Signature` (HMAC-SHA256 over timestamp + body). Receivers should verify using the endpoint secret.

### Retries

- Max attempts: 3 (`WEBHOOK_MAX_DELIVERY_ATTEMPTS`)
- Exponential backoff starting at 1s
- Rate limit profile for outbound webhook processing: 30 req / 60s per IP

## Security

- API key routes bypass JWT but use dedicated guard and rate limits
- Cross-organization access to keys/webhooks returns 404
- Expired API keys revoked by daily cleanup job
- Webhook secrets never returned after creation/update response

## Related Documentation

- [Authentication](./authentication.md) — API key auth details
- [Queues](./queues.md) — webhook delivery workers
- [Authorization](./authorization.md) — `integrations:read` / `integrations:write`

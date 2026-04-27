# Queues & Background Jobs

FleetOps uses **BullMQ** with **Redis** for asynchronous work. Job state is tracked in PostgreSQL (`Job` model) alongside BullMQ queue state.

## Queues

| Queue Name | Purpose |
| ---------- | ------- |
| `webhook-delivery` | Deliver webhook payloads to external URLs |
| `notifications` | Create in-app notifications asynchronously |
| `maintenance-reminders` | Notify about upcoming scheduled maintenance |
| `report-generation` | Generate large reports off the request thread |

Configuration: `apps/api/src/queues/constants/queue.constants.ts`

### Job Options (defaults)

- Max attempts: 3
- Backoff: exponential, 1s base delay
- Completed jobs retained: 250
- Failed jobs retained: 500

## Job Record Model

Every enqueued job creates a `Job` row:

| Field | Description |
| ----- | ----------- |
| `type` | `JobType` enum |
| `status` | `PENDING` → `PROCESSING` → `COMPLETED` / `FAILED` |
| `queueName` | BullMQ queue |
| `payload` | JSON job input |
| `bullJobId` | Linked Bull job ID |
| `attemptCount` | Retry count |
| `result` / `failureReason` | Outcome |

Job types:

- `WEBHOOK_DELIVERY`
- `NOTIFICATION`
- `MAINTENANCE_REMINDER`
- `LICENSE_EXPIRY_REMINDER`
- `REPORT_GENERATION`

## HTTP Endpoints

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| GET | `/api/v1/jobs` | `jobs:read` | List org jobs |
| GET | `/api/v1/jobs/:id` | `jobs:read` | Get job by ID |
| POST | `/api/v1/jobs/reports/:reportType` | `jobs:write` | Enqueue report job |
| GET | `/api/v1/queues/health` | `jobs:read` | Queue depth and health |

Cross-organization job access returns 404.

## Processors

| Processor | Queue | Action |
| --------- | ----- | ------ |
| `WebhookDeliveryProcessor` | webhook-delivery | HTTP POST with signature |
| `NotificationsProcessor` | notifications | Persist notification |
| `MaintenanceRemindersProcessor` | maintenance-reminders | Send maintenance reminder |
| `ReportGenerationProcessor` | report-generation | Run analytics, store result |

Processors update job records via `JobService` (`markProcessing`, `markCompleted`, `markFailed`).

## Schedulers

### Daily Reminder Scheduler

Cron: `0 6 * * *` (06:00 UTC daily)

`ReminderGenerationService` enqueues:

1. **License expiry reminders** — active drivers expiring within 30 days; notifies org admin
2. **Maintenance reminders** — scheduled maintenance within 7 days; notifies record creator

Admin recipient lookup is batched per organization for performance.

## Queue Health

`GET /api/v1/queues/health` returns per-queue metrics:

- Waiting, active, completed, failed counts
- `isHealthy` flag per queue

Included in the main health check at `/api/v1/health`.

## Cleanup

`DataCleanupService` (daily scheduler) removes:

- Expired/revoked refresh tokens (retention: `REFRESH_TOKEN_RETENTION_DAYS`, default 30)
- Expired API keys (auto-revoke)
- Completed jobs older than `COMPLETED_JOB_RETENTION_DAYS` (default 90)

## Environment

| Variable | Default | Description |
| -------- | ------- | ----------- |
| `REDIS_URL` | `redis://localhost:6379` | BullMQ connection |

Redis must be running for queue workers. The API starts workers in-process.

## Related Documentation

- [Reporting](./reporting.md) — async report generation
- [Integrations](./integrations.md) — webhook delivery queue
- [Notifications](./notifications.md) — notification queue
- [Maintenance](./maintenance.md) — maintenance reminders

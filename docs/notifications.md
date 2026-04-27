# Notifications

FleetOps provides in-app notifications with per-user preferences. Notifications can be created synchronously or enqueued via BullMQ for async delivery.

## Notification Types

Defined by Prisma enum `NotificationType`:

| Type | Typical Use |
| ---- | ----------- |
| `SYSTEM` | License expiry reminders, system alerts |
| `TRIP` | Trip lifecycle updates |
| `MAINTENANCE` | Maintenance started/completed |
| `FUEL` | Fuel record events |

## Endpoints

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| GET | `/api/v1/notifications` | `notifications:read` | List user notifications |
| GET | `/api/v1/notifications/unread` | `notifications:read` | Unread only |
| POST | `/api/v1/notifications/:id/read` | `notifications:write` | Mark one read |
| POST | `/api/v1/notifications/read-all` | `notifications:write` | Mark all read |
| GET | `/api/v1/notification-preferences` | `notifications:read` | Get preferences |
| PATCH | `/api/v1/notification-preferences` | `notifications:write` | Update preferences |

All notification endpoints are scoped to the authenticated user's organization and user ID.

## Preferences

Users can enable/disable notification types via preferences. If a type is disabled, `createNotification` returns `null` without persisting.

Preferences are seeded for demo users via `notification-preferences` seeder.

## Delivery Paths

### Synchronous

Domain services call `NotificationEventService` after successful operations (trips, maintenance, fuel).

### Asynchronous (queued)

The `notifications` BullMQ queue processes jobs created by:

- `NotificationQueueService.enqueueNotification`
- Daily license expiry reminder generation

Queue name: `notifications` (see [Queues](./queues.md)).

## Notification Payload

Each notification includes:

- `title`, `message`
- `type`
- `metadata` (JSON — entity IDs, dates, etc.)
- `readAt` (null when unread)
- `createdAt`

## Audit

Notification creation is audit-logged via `FleetAuditService.logNotificationCreated`.

## Related Documentation

- [Queues](./queues.md) — async notification jobs and reminders
- [Fleet Management](./fleet-management.md) — trip notification triggers

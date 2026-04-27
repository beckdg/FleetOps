# Maintenance

Maintenance tracks scheduled and in-progress vehicle service work. Maintenance lifecycle is tightly coupled to vehicle status.

## Maintenance Types

| Type | Description |
| ---- | ----------- |
| `PREVENTIVE` | Scheduled preventive service |
| `CORRECTIVE` | Repair work |
| `EMERGENCY` | Urgent repairs |

## Status Lifecycle

```
SCHEDULED → IN_PROGRESS → COMPLETED
     ↓            ↓
 CANCELLED    CANCELLED
```

| Transition | Event Type |
| ---------- | ---------- |
| Created | `MAINTENANCE_SCHEDULED` |
| → IN_PROGRESS | `MAINTENANCE_STARTED` |
| → COMPLETED | `MAINTENANCE_COMPLETED` |
| → CANCELLED | `MAINTENANCE_CANCELLED` |

## Endpoints

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| POST | `/api/v1/maintenance` | `maintenance:write` | Schedule maintenance |
| GET | `/api/v1/maintenance` | `maintenance:read` | List records (optional filters) |
| POST | `/api/v1/maintenance/:id/start` | `maintenance:write` | Start work |
| POST | `/api/v1/maintenance/:id/complete` | `maintenance:write` | Complete (optional `actualCost`) |
| POST | `/api/v1/maintenance/:id/cancel` | `maintenance:write` | Cancel |

## Vehicle Status Synchronization

Maintenance transitions update vehicle status inside the same database transaction:

| Action | Vehicle Status Change |
| ------ | --------------------- |
| Start maintenance | → `IN_MAINTENANCE` |
| Complete (no other in-progress) | `IN_MAINTENANCE` → `ACTIVE` |
| Cancel from `IN_PROGRESS` (no other in-progress) | `IN_MAINTENANCE` → `ACTIVE` |

Vehicle status changes are audit-logged separately from maintenance events.

### Constraint

Only **one in-progress maintenance record per vehicle** is allowed (PostgreSQL partial unique index `maintenance_records_in_progress_vehicle_idx`). Attempting to start a second concurrent job returns **409 Conflict**.

## Transactional Consistency

Schedule, start, complete, and cancel operations use Prisma `$transaction` to atomically:

1. Update maintenance record status and timestamps
2. Create maintenance event
3. Sync vehicle status (when applicable)

Audit logs, webhooks, and notifications run **after** the transaction commits.

## Side Effects

| Event | Webhook | Notification |
| ----- | ------- | ------------ |
| Started | `maintenance.started` | Maintenance started |
| Completed | `maintenance.completed` | Maintenance completed |

## Scheduling Fields

| Field | Description |
| ----- | ----------- |
| `scheduledAt` | Planned service date |
| `startedAt` | Set when work begins |
| `completedAt` | Set on completion |
| `estimatedCost` / `actualCost` | Decimal cost tracking |

## Reminders

Scheduled maintenance within 7 days triggers reminder jobs via the daily scheduler (see [Queues](./queues.md)). Reminders notify the record creator by default.

## Related Documentation

- [Fleet Management](./fleet-management.md) — trips blocked while vehicle is in maintenance
- [Reporting](./reporting.md) — maintenance analytics report

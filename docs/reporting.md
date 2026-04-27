# Reporting

FleetOps provides synchronous analytics reports and asynchronous report generation jobs.

## Report Types

| Type | Endpoint | Description |
| ---- | -------- | ----------- |
| Dashboard | `GET /api/v1/reports/dashboard` | Organization overview KPIs |
| Fleet | `GET /api/v1/reports/fleet` | Vehicle and assignment summary |
| Fuel | `GET /api/v1/reports/fuel` | Fuel consumption analytics |
| Maintenance | `GET /api/v1/reports/maintenance` | Maintenance workload and costs |
| Trips | `GET /api/v1/reports/trips` | Trip volume and completion metrics |

All report endpoints require `reports:read`.

## Date Range

Reports accept optional query parameters for filtering (parsed by `parseReportDateRange`):

- `startDate` — ISO date string
- `endDate` — ISO date string

When omitted, sensible defaults apply per report type.

## Response Envelope

Reports return a consistent envelope:

```json
{
  "reportType": "fleet",
  "organizationId": "...",
  "generatedAt": "2026-06-05T12:00:00.000Z",
  "format": "json",
  "period": { "startDate": "...", "endDate": "..." },
  "data": { ... }
}
```

Shared types live in `@fleetops/shared-types`.

## Synchronous vs Async

### Synchronous (HTTP)

Direct report endpoints compute analytics on demand via `AnalyticsService` and return immediately. Suitable for dashboards and interactive queries.

### Asynchronous (Jobs)

Large or scheduled reports can be enqueued:

```
POST /api/v1/jobs/reports/:reportType
```

Requires `jobs:write`. Returns `{ "jobId": "..." }`. Poll status via `GET /api/v1/jobs/:id`.

Supported `reportType` values: `dashboard`, `fleet`, `fuel`, `maintenance`, `trips`.

## Audit

Every report generation (sync or async) is audit-logged with report type and requesting user.

## Analytics Service

`AnalyticsService` aggregates data from:

- Vehicles, drivers, assignments
- Trips and trip events
- Maintenance records
- Fuel records

Calculations include totals, averages, status breakdowns, and period comparisons where applicable.

## Related Documentation

- [Queues](./queues.md) — report generation job pipeline
- [Authorization](./authorization.md) — `reports:read` permission

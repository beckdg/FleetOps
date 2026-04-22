# Fleet Management

Fleet management covers vehicles, drivers, vehicle assignments, and trips — the core operational entities of FleetOps.

## Vehicles

### Statuses

| Status | Description |
| ------ | ----------- |
| `ACTIVE` | Available for assignment and trips |
| `IN_MAINTENANCE` | Under maintenance — not assignable |
| `OUT_OF_SERVICE` | Temporarily unavailable |
| `RETIRED` | Permanently removed from service |

### Endpoints

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| POST | `/api/v1/vehicles` | `vehicles:write` | Create vehicle |
| GET | `/api/v1/vehicles` | `vehicles:read` | List org vehicles |
| GET | `/api/v1/vehicles/:vehicleId` | `vehicles:read` | Get vehicle |
| PATCH | `/api/v1/vehicles/:vehicleId/status` | `vehicles:write` | Update status |

Plate numbers and VINs are normalized to uppercase. Status changes are audit-logged.

Only `ACTIVE` vehicles can receive new assignments.

## Drivers

### Statuses

| Status | Description |
| ------ | ----------- |
| `ACTIVE` | Available for assignment |
| `INACTIVE` | Not assignable |
| `SUSPENDED` | Not assignable |

### Endpoints

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| POST | `/api/v1/drivers` | `drivers:write` | Create driver |
| GET | `/api/v1/drivers` | `drivers:read` | List org drivers |
| GET | `/api/v1/drivers/:driverId` | `drivers:read` | Get driver |
| PATCH | `/api/v1/drivers/:driverId/status` | `drivers:write` | Update status |

Drivers track license number and expiry date. License expiry triggers reminder jobs (see [Queues](./queues.md)).

## Vehicle Assignments

Links a driver to a vehicle for a period. Only one **active** assignment per vehicle and per driver (enforced by partial unique indexes).

### Endpoints

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| POST | `/api/v1/vehicle-assignments` | `vehicles:write` + `drivers:write` | Create assignment |
| POST | `/api/v1/vehicle-assignments/:id/end` | `vehicles:write` + `drivers:write` | End assignment |
| GET | `/api/v1/vehicle-assignments/active` | `vehicles:read` + `drivers:read` | Get active assignment |

Query `active` with `vehicleId` or `driverId`. Cross-org IDs return `null`, not an error.

### Rules

- Vehicle must be `ACTIVE`
- Driver must be `ACTIVE`
- No existing active assignment for vehicle or driver
- Assignment records `assignedByUserId` and `assignedAt`; ending sets `endedAt`

## Trips

Trips represent scheduled or active transport operations linking a vehicle and driver.

### Status Lifecycle

```
PLANNED → DISPATCHED → IN_PROGRESS → COMPLETED
   ↓           ↓
CANCELLED   CANCELLED
```

| Transition | Event Type |
| ---------- | ---------- |
| → DISPATCHED | `TRIP_DISPATCHED` |
| → IN_PROGRESS | `TRIP_STARTED` |
| → COMPLETED | `TRIP_COMPLETED` |
| → CANCELLED | `TRIP_CANCELLED` |

Creation emits `TRIP_CREATED` inside the same DB transaction as the trip record.

### Endpoints

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| POST | `/api/v1/trips` | `trips:write` | Create trip |
| GET | `/api/v1/trips` | `trips:read` | List trips |
| GET | `/api/v1/trips/active` | `trips:read` | Active trips |
| POST | `/api/v1/trips/:tripId/dispatch` | `trips:write` | Dispatch |
| POST | `/api/v1/trips/:tripId/start` | `trips:write` | Start |
| POST | `/api/v1/trips/:tripId/complete` | `trips:write` | Complete |
| POST | `/api/v1/trips/:tripId/cancel` | `trips:write` | Cancel |

### Business Rules

- Vehicle and driver must belong to the organization
- Vehicle cannot start trips while `IN_MAINTENANCE`
- Trip numbers are unique per organization
- Schedule overlap validation prevents conflicting active trips on the same vehicle/driver
- Status update + trip event are **atomic** (Prisma transaction)
- Webhooks fire on create/start/complete (`trip.created`, `trip.started`, `trip.completed`)

### Active Trip Statuses

`PLANNED`, `DISPATCHED`, and `IN_PROGRESS` are considered active for overlap checks.

## Inspections

Vehicle safety/compliance inspections (separate from maintenance).

| Method | Path | Permission |
| ------ | ---- | ---------- |
| POST | `/api/v1/inspections` | `maintenance:write` |
| GET | `/api/v1/inspections` | `maintenance:read` |

Failed inspections publish `inspection.failed` webhooks.

## Audit & Side Effects

Fleet operations emit audit events via `FleetAuditService`:

- Vehicle/driver status changes
- Assignment create/end
- Trip lifecycle transitions

Webhooks and notifications run after successful persistence.

## Related Documentation

- [Maintenance](./maintenance.md) — vehicle `IN_MAINTENANCE` status
- [Fuel Management](./fuel-management.md) — fuel records linked to trips
- [Reporting](./reporting.md) — fleet and trip analytics

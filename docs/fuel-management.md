# Fuel Management

Fuel management tracks fuel purchases, stations, and per-vehicle consumption analytics.

## Entities

| Entity | Description |
| ------ | ----------- |
| **FuelStation** | Organization-scoped fuel location |
| **FuelRecord** | Individual fill-up linked to a vehicle |

Fuel records optionally link to a trip and/or fuel station.

## Endpoints

| Method | Path | Permission | Description |
| ------ | ---- | ---------- | ----------- |
| POST | `/api/v1/fuel/records` | `fuel:write` | Create fuel record |
| GET | `/api/v1/fuel/records` | `fuel:read` | List records (date filters) |
| POST | `/api/v1/fuel/stations` | `fuel:write` | Create fuel station |
| GET | `/api/v1/fuel/vehicles/:vehicleId/summary` | `fuel:read` | Vehicle fuel summary |

## Creating Fuel Records

Required fields:

- `vehicleId` — must belong to organization
- `odometerReading` — non-negative; must not regress below prior max for vehicle
- `litersPurchased` — must be > 0
- `pricePerLiter` — must be > 0
- `filledAt` — ISO datetime

Optional:

- `tripId` — must belong to same org and vehicle
- `fuelStationId` — must belong to organization

`totalCost` is computed as `litersPurchased × pricePerLiter`.

## Validation Rules

| Rule | Error |
| ---- | ----- |
| Negative odometer | 400 Bad Request |
| Odometer regression | 400 Bad Request |
| Trip on wrong vehicle/org | 400 Bad Request |
| Invalid fill date | 400 Bad Request |

## Vehicle Fuel Summary

`GET /fuel/vehicles/:vehicleId/summary` returns aggregated metrics:

- Total liters and cost
- Kilometers driven (from odometer progression)
- Liters per kilometer
- Average cost per kilometer
- Average fuel per trip (when trip-linked records exist)

## Side Effects

On fuel record creation:

- Audit log (`logFuelRecordCreated`)
- Webhook: `fuel.record.created`
- Notification to relevant users (via `NotificationEventService`)

## Analytics

Fuel analytics feed into reports (see [Reporting](./reporting.md)):

- `GET /api/v1/reports/fuel` — organization fuel analytics for a date range

## Related Documentation

- [Fleet Management](./fleet-management.md) — vehicles and trips
- [Integrations](./integrations.md) — `fuel.record.created` webhook payload

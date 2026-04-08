# Partial unique indexes

FleetOps relies on PostgreSQL partial unique indexes for fleet invariants. Prisma schema does not yet declare partial indexes in this project; they are created by SQL migrations and documented here to avoid drift.

| Index | Table | Predicate | Purpose |
| ----- | ----- | --------- | ------- |
| `vehicle_assignments_active_vehicle_idx` | `vehicle_assignments` | `ended_at IS NULL` | At most one active assignment per vehicle |
| `vehicle_assignments_active_driver_idx` | `vehicle_assignments` | `ended_at IS NULL` | At most one active assignment per driver |
| `maintenance_records_in_progress_vehicle_idx` | `maintenance_records` | `status = 'IN_PROGRESS'` | At most one in-progress maintenance per vehicle |

## Source migrations

- `20250606120000_add_fleet_domain/migration.sql`
- `20250608120000_add_maintenance_domain/migration.sql`

## Reproducing on a fresh database

```bash
pnpm --filter @fleetops/api prisma:migrate:deploy
```

If you change a partial index definition, add a new migration with explicit SQL rather than editing historical migrations.

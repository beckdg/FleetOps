-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('PLANNED', 'DISPATCHED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripEventType" AS ENUM ('TRIP_CREATED', 'TRIP_DISPATCHED', 'TRIP_STARTED', 'TRIP_COMPLETED', 'TRIP_CANCELLED');

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organization_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "trip_number" TEXT NOT NULL,
    "origin" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "scheduled_start_at" TIMESTAMP(3) NOT NULL,
    "scheduled_end_at" TIMESTAMP(3) NOT NULL,
    "actual_start_at" TIMESTAMP(3),
    "actual_end_at" TIMESTAMP(3),
    "status" "TripStatus" NOT NULL DEFAULT 'PLANNED',
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trip_id" UUID NOT NULL,
    "event_type" "TripEventType" NOT NULL,
    "notes" TEXT,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trips_organization_id_trip_number_key" ON "trips"("organization_id", "trip_number");

-- CreateIndex
CREATE INDEX "trips_organization_id_idx" ON "trips"("organization_id");

-- CreateIndex
CREATE INDEX "trips_organization_id_status_idx" ON "trips"("organization_id", "status");

-- CreateIndex
CREATE INDEX "trips_vehicle_id_idx" ON "trips"("vehicle_id");

-- CreateIndex
CREATE INDEX "trips_driver_id_idx" ON "trips"("driver_id");

-- CreateIndex
CREATE INDEX "trips_schedule_idx" ON "trips"("scheduled_start_at", "scheduled_end_at");

-- CreateIndex
CREATE INDEX "trips_status_idx" ON "trips"("status");

-- CreateIndex
CREATE INDEX "trip_events_trip_id_idx" ON "trip_events"("trip_id");

-- CreateIndex
CREATE INDEX "trip_events_event_type_idx" ON "trip_events"("event_type");

-- CreateIndex
CREATE INDEX "trip_events_created_at_idx" ON "trip_events"("created_at");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_events" ADD CONSTRAINT "trip_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

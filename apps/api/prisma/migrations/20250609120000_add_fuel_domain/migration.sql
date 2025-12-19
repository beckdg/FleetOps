-- CreateTable
CREATE TABLE "fuel_stations" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuel_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_records" (
    "id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "vehicle_id" UUID NOT NULL,
    "trip_id" UUID,
    "fuel_station_id" UUID,
    "odometer_reading" INTEGER NOT NULL,
    "liters_purchased" DECIMAL(10,3) NOT NULL,
    "price_per_liter" DECIMAL(12,4) NOT NULL,
    "total_cost" DECIMAL(12,2) NOT NULL,
    "filled_at" TIMESTAMP(3) NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fuel_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "fuel_stations_organization_id_idx" ON "fuel_stations"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "fuel_stations_organization_id_name_key" ON "fuel_stations"("organization_id", "name");

-- CreateIndex
CREATE INDEX "fuel_records_organization_id_idx" ON "fuel_records"("organization_id");

-- CreateIndex
CREATE INDEX "fuel_records_vehicle_id_idx" ON "fuel_records"("vehicle_id");

-- CreateIndex
CREATE INDEX "fuel_records_vehicle_id_filled_at_idx" ON "fuel_records"("vehicle_id", "filled_at");

-- CreateIndex
CREATE INDEX "fuel_records_trip_id_idx" ON "fuel_records"("trip_id");

-- CreateIndex
CREATE INDEX "fuel_records_fuel_station_id_idx" ON "fuel_records"("fuel_station_id");

-- CreateIndex
CREATE INDEX "fuel_records_filled_at_idx" ON "fuel_records"("filled_at");

-- AddForeignKey
ALTER TABLE "fuel_stations" ADD CONSTRAINT "fuel_stations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_fuel_station_id_fkey" FOREIGN KEY ("fuel_station_id") REFERENCES "fuel_stations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_records" ADD CONSTRAINT "fuel_records_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

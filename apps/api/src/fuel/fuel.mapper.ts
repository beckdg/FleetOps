import { FuelRecord, FuelStation } from '@prisma/client';
import { FuelRecordResponse, FuelStationResponse } from '@fleetops/shared-types';

export function toFuelStationResponse(station: FuelStation): FuelStationResponse {
  return {
    id: station.id,
    organizationId: station.organizationId,
    name: station.name,
    location: station.location,
    createdAt: station.createdAt.toISOString(),
  };
}

export function toFuelRecordResponse(record: FuelRecord): FuelRecordResponse {
  return {
    id: record.id,
    organizationId: record.organizationId,
    vehicleId: record.vehicleId,
    tripId: record.tripId,
    fuelStationId: record.fuelStationId,
    odometerReading: record.odometerReading,
    litersPurchased: record.litersPurchased.toString(),
    pricePerLiter: record.pricePerLiter.toString(),
    totalCost: record.totalCost.toString(),
    filledAt: record.filledAt.toISOString(),
    createdByUserId: record.createdByUserId,
    createdAt: record.createdAt.toISOString(),
  };
}

import { Vehicle } from '@prisma/client';
import { VehicleResponse } from '@fleetops/shared-types';

export function toVehicleResponse(vehicle: Vehicle): VehicleResponse {
  return {
    id: vehicle.id,
    organizationId: vehicle.organizationId,
    plateNumber: vehicle.plateNumber,
    vin: vehicle.vin,
    make: vehicle.make,
    model: vehicle.model,
    year: vehicle.year,
    status: vehicle.status,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}

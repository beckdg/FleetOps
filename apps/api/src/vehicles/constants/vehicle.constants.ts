import { VehicleStatus } from '@prisma/client';

export const ASSIGNABLE_VEHICLE_STATUS = VehicleStatus.ACTIVE;

export const NON_ASSIGNABLE_VEHICLE_STATUSES: VehicleStatus[] = [
  VehicleStatus.IN_MAINTENANCE,
  VehicleStatus.OUT_OF_SERVICE,
  VehicleStatus.RETIRED,
];

export function isVehicleAssignable(status: VehicleStatus): boolean {
  return status === ASSIGNABLE_VEHICLE_STATUS;
}

export function vehicleStatusMessage(status: VehicleStatus): string {
  return `Vehicle cannot be assigned while status is ${status}`;
}

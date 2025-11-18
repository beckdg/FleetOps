import { DriverStatus } from '@prisma/client';

export const ASSIGNABLE_DRIVER_STATUS = DriverStatus.ACTIVE;

export const NON_ASSIGNABLE_DRIVER_STATUSES: DriverStatus[] = [
  DriverStatus.SUSPENDED,
  DriverStatus.INACTIVE,
];

export function isDriverAssignable(status: DriverStatus): boolean {
  return status === ASSIGNABLE_DRIVER_STATUS;
}

export function driverStatusMessage(status: DriverStatus): string {
  return `Driver cannot be assigned while status is ${status}`;
}

import { Driver } from '@prisma/client';
import { DriverResponse } from '@fleetops/shared-types';

export function toDriverResponse(driver: Driver): DriverResponse {
  return {
    id: driver.id,
    organizationId: driver.organizationId,
    employeeId: driver.employeeId,
    firstName: driver.firstName,
    lastName: driver.lastName,
    licenseNumber: driver.licenseNumber,
    licenseExpiryDate: driver.licenseExpiryDate.toISOString().slice(0, 10),
    status: driver.status,
    createdAt: driver.createdAt.toISOString(),
    updatedAt: driver.updatedAt.toISOString(),
  };
}

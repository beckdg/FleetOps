export type VehicleStatus = 'ACTIVE' | 'IN_MAINTENANCE' | 'OUT_OF_SERVICE' | 'RETIRED';

export type DriverStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export interface VehicleResponse {
  id: string;
  organizationId: string;
  plateNumber: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  status: VehicleStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DriverResponse {
  id: string;
  organizationId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
  licenseExpiryDate: string;
  status: DriverStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleAssignmentResponse {
  id: string;
  organizationId: string;
  vehicleId: string;
  driverId: string;
  assignedAt: string;
  endedAt: string | null;
  assignedByUserId: string;
}

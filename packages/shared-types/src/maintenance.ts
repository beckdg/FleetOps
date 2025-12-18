export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE' | 'EMERGENCY';

export type MaintenanceEventType =
  | 'MAINTENANCE_SCHEDULED'
  | 'MAINTENANCE_STARTED'
  | 'MAINTENANCE_COMPLETED'
  | 'MAINTENANCE_CANCELLED';

export interface MaintenanceRecordResponse {
  id: string;
  organizationId: string;
  vehicleId: string;
  title: string;
  description: string | null;
  maintenanceType: MaintenanceType;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  status: MaintenanceStatus;
  estimatedCost: string | null;
  actualCost: string | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionResponse {
  id: string;
  organizationId: string;
  vehicleId: string;
  inspectionDate: string;
  passed: boolean;
  notes: string | null;
  inspectorName: string;
  createdByUserId: string;
  createdAt: string;
}

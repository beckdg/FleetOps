import { MaintenanceRecord } from '@prisma/client';
import { MaintenanceRecordResponse } from '@fleetops/shared-types';

export function toMaintenanceRecordResponse(record: MaintenanceRecord): MaintenanceRecordResponse {
  return {
    id: record.id,
    organizationId: record.organizationId,
    vehicleId: record.vehicleId,
    title: record.title,
    description: record.description,
    maintenanceType: record.maintenanceType,
    scheduledAt: record.scheduledAt.toISOString(),
    startedAt: record.startedAt?.toISOString() ?? null,
    completedAt: record.completedAt?.toISOString() ?? null,
    status: record.status,
    estimatedCost: record.estimatedCost?.toString() ?? null,
    actualCost: record.actualCost?.toString() ?? null,
    createdByUserId: record.createdByUserId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

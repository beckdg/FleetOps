import { Inspection } from '@prisma/client';
import { InspectionResponse } from '@fleetops/shared-types';

export function toInspectionResponse(inspection: Inspection): InspectionResponse {
  return {
    id: inspection.id,
    organizationId: inspection.organizationId,
    vehicleId: inspection.vehicleId,
    inspectionDate: inspection.inspectionDate.toISOString().slice(0, 10),
    passed: inspection.passed,
    notes: inspection.notes,
    inspectorName: inspection.inspectorName,
    createdByUserId: inspection.createdByUserId,
    createdAt: inspection.createdAt.toISOString(),
  };
}

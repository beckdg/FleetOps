import { VehicleAssignment } from '@prisma/client';
import { VehicleAssignmentResponse } from '@fleetops/shared-types';

export function toVehicleAssignmentResponse(
  assignment: VehicleAssignment,
): VehicleAssignmentResponse {
  return {
    id: assignment.id,
    organizationId: assignment.organizationId,
    vehicleId: assignment.vehicleId,
    driverId: assignment.driverId,
    assignedAt: assignment.assignedAt.toISOString(),
    endedAt: assignment.endedAt?.toISOString() ?? null,
    assignedByUserId: assignment.assignedByUserId,
  };
}

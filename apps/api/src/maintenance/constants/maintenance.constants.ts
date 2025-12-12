import { MaintenanceEventType, MaintenanceStatus } from '@prisma/client';

export const ALLOWED_MAINTENANCE_TRANSITIONS: Record<MaintenanceStatus, MaintenanceStatus[]> = {
  [MaintenanceStatus.SCHEDULED]: [MaintenanceStatus.IN_PROGRESS, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.IN_PROGRESS]: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CANCELLED],
  [MaintenanceStatus.COMPLETED]: [],
  [MaintenanceStatus.CANCELLED]: [],
};

export const STATUS_TO_MAINTENANCE_EVENT_TYPE: Partial<
  Record<MaintenanceStatus, MaintenanceEventType>
> = {
  [MaintenanceStatus.SCHEDULED]: MaintenanceEventType.MAINTENANCE_SCHEDULED,
  [MaintenanceStatus.IN_PROGRESS]: MaintenanceEventType.MAINTENANCE_STARTED,
  [MaintenanceStatus.COMPLETED]: MaintenanceEventType.MAINTENANCE_COMPLETED,
  [MaintenanceStatus.CANCELLED]: MaintenanceEventType.MAINTENANCE_CANCELLED,
};

export function isAllowedMaintenanceTransition(
  from: MaintenanceStatus,
  to: MaintenanceStatus,
): boolean {
  return ALLOWED_MAINTENANCE_TRANSITIONS[from].includes(to);
}

export function maintenanceTransitionErrorMessage(
  from: MaintenanceStatus,
  to: MaintenanceStatus,
): string {
  return `Invalid maintenance status transition from ${from} to ${to}`;
}

export function assertAllowedMaintenanceTransition(
  from: MaintenanceStatus,
  to: MaintenanceStatus,
): void {
  if (!isAllowedMaintenanceTransition(from, to)) {
    throw new Error(maintenanceTransitionErrorMessage(from, to));
  }
}

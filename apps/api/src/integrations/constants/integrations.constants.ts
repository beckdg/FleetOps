export const API_KEY_PREFIX = 'fleetops_live_';

export const WEBHOOK_SIGNATURE_HEADER = 'X-FleetOps-Signature';

export const WEBHOOK_MAX_DELIVERY_ATTEMPTS = 3;

export const WEBHOOK_EVENT_TYPES = {
  TRIP_CREATED: 'trip.created',
  TRIP_STARTED: 'trip.started',
  TRIP_COMPLETED: 'trip.completed',
  MAINTENANCE_STARTED: 'maintenance.started',
  MAINTENANCE_COMPLETED: 'maintenance.completed',
  INSPECTION_FAILED: 'inspection.failed',
  FUEL_RECORD_CREATED: 'fuel.record.created',
} as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[keyof typeof WEBHOOK_EVENT_TYPES];

export const INTEGRATIONS_API_KEY_AUTH = 'integrationsApiKey';

import { ExecutionContext } from '@nestjs/common';

export const REQUEST_ID_HEADER = 'x-request-id';

export const DEFAULT_ACCOUNT_LOCKOUT_MAX_ATTEMPTS = 5;

export const DEFAULT_ACCOUNT_LOCKOUT_DURATION_MINUTES = 15;

export const DEFAULT_RATE_LIMIT_AUTH_TTL_MS = 60_000;

export const DEFAULT_RATE_LIMIT_AUTH_LIMIT = 20;

export const DEFAULT_RATE_LIMIT_API_KEY_TTL_MS = 60_000;

export const DEFAULT_RATE_LIMIT_API_KEY_LIMIT = 60;

export const DEFAULT_RATE_LIMIT_WEBHOOK_TTL_MS = 60_000;

export const DEFAULT_RATE_LIMIT_WEBHOOK_LIMIT = 30;

export const DEFAULT_REFRESH_TOKEN_RETENTION_DAYS = 30;

export const DEFAULT_COMPLETED_JOB_RETENTION_DAYS = 90;

export const DEFAULT_AUDIT_BUFFER_SIZE = 10_000;

export const DEFAULT_CLEANUP_CRON = '0 3 * * *';

export const THROTTLE_PROFILES = {
  AUTH: 'auth',
  API_KEY: 'apiKey',
  WEBHOOK: 'webhook',
} as const;

const AUTH_CONTROLLER = 'AuthController';
const AUTH_RATE_LIMITED_HANDLERS = new Set(['login', 'register', 'refresh', 'logout']);

const INTEGRATIONS_CONTROLLER = 'IntegrationsController';
const API_KEY_RATE_LIMITED_HANDLERS = new Set([
  'createApiKey',
  'listApiKeys',
  'revokeApiKey',
  'getApiKeyContext',
]);
const WEBHOOK_RATE_LIMITED_HANDLERS = new Set([
  'createWebhook',
  'listWebhooks',
  'updateWebhook',
  'listWebhookDeliveries',
]);

function shouldSkipUnless(
  context: ExecutionContext,
  controllerName: string,
  handlers: Set<string>,
): boolean {
  const handlerName = context.getHandler()?.name ?? '';

  if (context.getClass()?.name !== controllerName) {
    return true;
  }

  return !handlers.has(handlerName);
}

export function shouldSkipAuthThrottle(context: ExecutionContext): boolean {
  return shouldSkipUnless(context, AUTH_CONTROLLER, AUTH_RATE_LIMITED_HANDLERS);
}

export function shouldSkipApiKeyThrottle(context: ExecutionContext): boolean {
  return shouldSkipUnless(context, INTEGRATIONS_CONTROLLER, API_KEY_RATE_LIMITED_HANDLERS);
}

export function shouldSkipWebhookThrottle(context: ExecutionContext): boolean {
  return shouldSkipUnless(context, INTEGRATIONS_CONTROLLER, WEBHOOK_RATE_LIMITED_HANDLERS);
}

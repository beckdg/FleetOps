import * as Joi from 'joi';

export const JWT_DEFAULTS = {
  ACCESS_EXPIRES_IN: '15m',
  REFRESH_EXPIRES_IN: '7d',
} as const;

/**
 * Placeholder secret for local/test environments only.
 * Replace in production via JWT_SECRET.
 */
export const JWT_DEV_PLACEHOLDER_SECRET =
  'fleetops-dev-jwt-secret-change-in-production-min-32-chars';

const durationPattern = /^\d+[smhdw]$/;

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  APP_VERSION: string;
  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: number;
  ACCOUNT_LOCKOUT_DURATION_MINUTES: number;
  RATE_LIMIT_AUTH_TTL_MS: number;
  RATE_LIMIT_AUTH_LIMIT: number;
  RATE_LIMIT_API_KEY_TTL_MS: number;
  RATE_LIMIT_API_KEY_LIMIT: number;
  RATE_LIMIT_WEBHOOK_TTL_MS: number;
  RATE_LIMIT_WEBHOOK_LIMIT: number;
  REFRESH_TOKEN_RETENTION_DAYS: number;
  COMPLETED_JOB_RETENTION_DAYS: number;
  AUDIT_BUFFER_SIZE: number;
}

export const envValidationSchema = Joi.object<EnvironmentVariables>({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),
  REDIS_URL: Joi.string()
    .uri({ scheme: ['redis', 'rediss'] })
    .default('redis://localhost:6379'),
  JWT_SECRET: Joi.string()
    .min(32)
    .when('NODE_ENV', {
      is: 'production',
      then: Joi.invalid(JWT_DEV_PLACEHOLDER_SECRET).messages({
        'any.invalid': 'JWT_SECRET must be changed from the development placeholder in production',
      }),
    })
    .default(JWT_DEV_PLACEHOLDER_SECRET),
  JWT_ACCESS_EXPIRES_IN: Joi.string()
    .pattern(durationPattern)
    .default(JWT_DEFAULTS.ACCESS_EXPIRES_IN),
  JWT_REFRESH_EXPIRES_IN: Joi.string()
    .pattern(durationPattern)
    .default(JWT_DEFAULTS.REFRESH_EXPIRES_IN),
  APP_VERSION: Joi.string().max(32).default('0.1.0'),
  ACCOUNT_LOCKOUT_MAX_ATTEMPTS: Joi.number().integer().min(1).max(20).default(5),
  ACCOUNT_LOCKOUT_DURATION_MINUTES: Joi.number().integer().min(1).max(1440).default(15),
  RATE_LIMIT_AUTH_TTL_MS: Joi.number().integer().min(1000).max(3_600_000).default(60_000),
  RATE_LIMIT_AUTH_LIMIT: Joi.number().integer().min(1).max(10_000).default(20),
  RATE_LIMIT_API_KEY_TTL_MS: Joi.number().integer().min(1000).max(3_600_000).default(60_000),
  RATE_LIMIT_API_KEY_LIMIT: Joi.number().integer().min(1).max(10_000).default(60),
  RATE_LIMIT_WEBHOOK_TTL_MS: Joi.number().integer().min(1000).max(3_600_000).default(60_000),
  RATE_LIMIT_WEBHOOK_LIMIT: Joi.number().integer().min(1).max(10_000).default(30),
  REFRESH_TOKEN_RETENTION_DAYS: Joi.number().integer().min(1).max(3650).default(30),
  COMPLETED_JOB_RETENTION_DAYS: Joi.number().integer().min(1).max(3650).default(90),
  AUDIT_BUFFER_SIZE: Joi.number().integer().min(100).max(100_000).default(10_000),
});

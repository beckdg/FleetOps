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

export interface EnvironmentVariables {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
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
  JWT_ACCESS_EXPIRES_IN: Joi.string().default(JWT_DEFAULTS.ACCESS_EXPIRES_IN),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default(JWT_DEFAULTS.REFRESH_EXPIRES_IN),
});

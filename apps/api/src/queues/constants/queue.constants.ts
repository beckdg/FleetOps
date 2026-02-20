export const QUEUE_NAMES = {
  WEBHOOK_DELIVERY: 'webhook-delivery',
  NOTIFICATIONS: 'notifications',
  MAINTENANCE_REMINDERS: 'maintenance-reminders',
  REPORT_GENERATION: 'report-generation',
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

export const JOB_MAX_ATTEMPTS = 3;

export const JOB_BACKOFF_OPTIONS = {
  type: 'exponential' as const,
  delay: 1000,
};

export const DEFAULT_QUEUE_JOB_OPTIONS = {
  attempts: JOB_MAX_ATTEMPTS,
  backoff: JOB_BACKOFF_OPTIONS,
  removeOnComplete: 250,
  removeOnFail: 500,
};

export const LICENSE_EXPIRY_REMINDER_DAYS = 30;

export const MAINTENANCE_REMINDER_DAYS = 7;

export const DAILY_REMINDER_CRON = '0 6 * * *';

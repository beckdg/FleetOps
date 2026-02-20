import { DEFAULT_QUEUE_JOB_OPTIONS, JOB_MAX_ATTEMPTS, QUEUE_NAMES } from './queue.constants';

describe('queue.constants', () => {
  it('defines the required queue names', () => {
    expect(QUEUE_NAMES.WEBHOOK_DELIVERY).toBe('webhook-delivery');
    expect(QUEUE_NAMES.NOTIFICATIONS).toBe('notifications');
    expect(QUEUE_NAMES.MAINTENANCE_REMINDERS).toBe('maintenance-reminders');
    expect(QUEUE_NAMES.REPORT_GENERATION).toBe('report-generation');
  });

  it('configures exponential backoff with three attempts', () => {
    expect(DEFAULT_QUEUE_JOB_OPTIONS.attempts).toBe(JOB_MAX_ATTEMPTS);
    expect(DEFAULT_QUEUE_JOB_OPTIONS.backoff).toEqual({ type: 'exponential', delay: 1000 });
  });
});

import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('aggregates request, job, and webhook metrics', () => {
    service.recordRequest(true);
    service.recordRequest(true);
    service.recordRequest(false);
    service.recordJobCompleted();
    service.recordJobCompleted();
    service.recordJobFailed();
    service.recordWebhookDelivery(true);
    service.recordWebhookDelivery(false);

    const snapshot = service.getSnapshot();

    expect(snapshot.requests).toEqual({ total: 3, failed: 1 });
    expect(snapshot.jobs).toEqual({
      completed: 2,
      failed: 1,
      successRate: 0.6667,
      failureRate: 0.3333,
    });
    expect(snapshot.webhooks).toEqual({
      delivered: 1,
      failed: 1,
      successRate: 0.5,
      failureRate: 0.5,
    });
  });

  it('resets counters', () => {
    service.recordRequest(false);
    service.reset();

    expect(service.getSnapshot().requests).toEqual({ total: 0, failed: 0 });
  });
});

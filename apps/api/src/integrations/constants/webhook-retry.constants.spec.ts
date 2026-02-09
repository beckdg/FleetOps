import {
  isFinalFailedAttempt,
  nextAttemptNumber,
  shouldRetryDelivery,
} from '../constants/webhook-retry.constants';

describe('webhook retry policy', () => {
  it('allows retries for attempts 1 and 2', () => {
    expect(shouldRetryDelivery(1)).toBe(true);
    expect(shouldRetryDelivery(2)).toBe(true);
    expect(shouldRetryDelivery(3)).toBe(false);
  });

  it('increments attempt numbers', () => {
    expect(nextAttemptNumber(1)).toBe(2);
    expect(nextAttemptNumber(2)).toBe(3);
  });

  it('marks attempt 3 as final failure', () => {
    expect(isFinalFailedAttempt(3)).toBe(true);
    expect(isFinalFailedAttempt(2)).toBe(false);
  });
});

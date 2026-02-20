import { isTerminalJobStatus, shouldRetryJobAttempt } from './job.constants';

describe('job.constants', () => {
  describe('shouldRetryJobAttempt', () => {
    it('allows retries for attempts 1 and 2', () => {
      expect(shouldRetryJobAttempt(1)).toBe(true);
      expect(shouldRetryJobAttempt(2)).toBe(true);
      expect(shouldRetryJobAttempt(3)).toBe(false);
    });
  });

  describe('isTerminalJobStatus', () => {
    it('treats completed and failed as terminal', () => {
      expect(isTerminalJobStatus('COMPLETED' as never)).toBe(true);
      expect(isTerminalJobStatus('FAILED' as never)).toBe(true);
      expect(isTerminalJobStatus('PENDING' as never)).toBe(false);
      expect(isTerminalJobStatus('PROCESSING' as never)).toBe(false);
    });
  });
});

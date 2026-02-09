import { WEBHOOK_MAX_DELIVERY_ATTEMPTS } from '../constants/integrations.constants';

export function shouldRetryDelivery(attemptNumber: number): boolean {
  return attemptNumber < WEBHOOK_MAX_DELIVERY_ATTEMPTS;
}

export function nextAttemptNumber(currentAttemptNumber: number): number {
  return currentAttemptNumber + 1;
}

export function isFinalFailedAttempt(attemptNumber: number): boolean {
  return attemptNumber >= WEBHOOK_MAX_DELIVERY_ATTEMPTS;
}

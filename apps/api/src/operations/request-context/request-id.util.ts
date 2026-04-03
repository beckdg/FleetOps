import { randomUUID } from 'crypto';
import { Request } from 'express';

export type RequestWithId = Request & { requestId?: string };

export function resolveRequestId(headerValue: string | string[] | undefined): string {
  const candidate = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (typeof candidate === 'string' && candidate.trim().length >= 8 && candidate.length <= 128) {
    return candidate.trim();
  }

  return randomUUID();
}

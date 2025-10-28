import { createHash, randomBytes } from 'crypto';

export interface GeneratedRefreshToken {
  rawToken: string;
  tokenHash: string;
}

export function generateRefreshToken(): GeneratedRefreshToken {
  const rawToken = randomBytes(64).toString('base64url');
  const tokenHash = hashRefreshToken(rawToken);

  return { rawToken, tokenHash };
}

export function hashRefreshToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

export function addDurationToDate(from: Date, duration: string): Date {
  const milliseconds = parseDurationToMilliseconds(duration);
  return new Date(from.getTime() + milliseconds);
}

export function parseDurationToMilliseconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number.parseInt(match[1]!, 10);
  const unit = match[2]!;

  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return value * multipliers[unit]!;
}

import { createHash, randomBytes, timingSafeEqual } from 'crypto';

import { API_KEY_PREFIX } from '../constants/integrations.constants';

export interface GeneratedApiKey {
  plaintextKey: string;
  keyPrefix: string;
  hashedKey: string;
}

export function hashApiKey(plaintextKey: string): string {
  return createHash('sha256').update(plaintextKey).digest('hex');
}

export function generateApiKey(): GeneratedApiKey {
  const randomPart = randomBytes(24).toString('base64url');
  const plaintextKey = `${API_KEY_PREFIX}${randomPart}`;
  const keyPrefix = plaintextKey.slice(0, API_KEY_PREFIX.length + 8);

  return {
    plaintextKey,
    keyPrefix,
    hashedKey: hashApiKey(plaintextKey),
  };
}

export function secureCompareApiKeyHashes(providedHash: string, storedHash: string): boolean {
  const providedBuffer = Buffer.from(providedHash, 'utf8');
  const storedBuffer = Buffer.from(storedHash, 'utf8');

  if (providedBuffer.length !== storedBuffer.length) {
    return false;
  }

  return timingSafeEqual(providedBuffer, storedBuffer);
}

export function isApiKeyToken(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}

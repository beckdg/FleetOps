import {
  generateApiKey,
  hashApiKey,
  isApiKeyToken,
  secureCompareApiKeyHashes,
} from './api-key.util';
import { API_KEY_PREFIX } from '../constants/integrations.constants';

describe('api-key.util', () => {
  describe('hashApiKey', () => {
    it('hashes keys with SHA256 hex digest', () => {
      const hash = hashApiKey('fleetops_live_test_key');

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
      expect(hash).toBe(hashApiKey('fleetops_live_test_key'));
      expect(hash).not.toBe(hashApiKey('fleetops_live_other_key'));
    });
  });

  describe('generateApiKey', () => {
    it('creates fleetops_live prefixed keys and stores only hash', () => {
      const generated = generateApiKey();

      expect(generated.plaintextKey.startsWith(API_KEY_PREFIX)).toBe(true);
      expect(generated.keyPrefix.startsWith(API_KEY_PREFIX)).toBe(true);
      expect(generated.hashedKey).toBe(hashApiKey(generated.plaintextKey));
    });
  });

  describe('secureCompareApiKeyHashes', () => {
    it('returns true for matching hashes', () => {
      const hash = hashApiKey('fleetops_live_compare');

      expect(secureCompareApiKeyHashes(hash, hash)).toBe(true);
    });

    it('returns false for mismatched hashes without throwing', () => {
      const left = hashApiKey('fleetops_live_left');
      const right = hashApiKey('fleetops_live_right');

      expect(secureCompareApiKeyHashes(left, right)).toBe(false);
    });

    it('returns false when lengths differ', () => {
      expect(secureCompareApiKeyHashes('abc', 'abcd')).toBe(false);
    });
  });

  describe('isApiKeyToken', () => {
    it('detects FleetOps API key tokens', () => {
      expect(isApiKeyToken('fleetops_live_abc123')).toBe(true);
      expect(isApiKeyToken('Bearer fleetops_live_abc123')).toBe(false);
      expect(isApiKeyToken('jwt.token.value')).toBe(false);
    });
  });
});

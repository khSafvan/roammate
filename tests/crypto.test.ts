import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearVaultSession,
  deleteLocalAccount,
  formatAccountId,
  generateVaultPhrase,
  getVaultSession,
  hashPhrase,
  pruneInactiveLocalData,
  saveVaultSession,
  validateVaultPhrase,
} from '../src/auth/crypto';
import { RETENTION_POLICY, STORAGE_KEYS } from '../src/config/constants';

// In-memory mock localStorage for Node/test environment
const storageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (i: number) => Object.keys(store)[i] || null,
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  writable: true,
});

describe('Cryptographic Vault & Retention Policy', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('generateVaultPhrase & validateVaultPhrase', () => {
    it('generates a valid 12-word BIP-39 recovery phrase', () => {
      const phrase = generateVaultPhrase();
      const words = phrase.trim().split(/\s+/);
      expect(words).toHaveLength(12);
      expect(validateVaultPhrase(phrase)).toBe(true);
    });

    it('rejects invalid phrases with incorrect checksums or lengths', () => {
      expect(validateVaultPhrase('abandon abandon abandon')).toBe(false);
      expect(validateVaultPhrase('invalid word sequence that is not bip39 valid at all for sure')).toBe(false);
      expect(validateVaultPhrase('')).toBe(false);
    });
  });

  describe('hashPhrase & formatAccountId', () => {
    it('generates a consistent deterministic hex hash for a phrase', async () => {
      const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
      const hash1 = await hashPhrase(phrase);
      const hash2 = await hashPhrase(phrase);
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[0-9a-f]{64}$/);
    });

    it('formats a 64-char account ID into an abbreviated human-readable token', () => {
      const userId = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
      const formatted = formatAccountId(userId);
      expect(formatted).toBe('0xe3b0...b855');
    });
  });

  describe('saveVaultSession, getVaultSession, and clearVaultSession', () => {
    it('persists and retrieves a vault session correctly', () => {
      const now = Date.now();
      saveVaultSession('user_123', 'alpha beta gamma delta echo fox golf hotel india juliet kilo lima', now);

      const session = getVaultSession();
      expect(session).not.toBeNull();
      expect(session?.userId).toBe('user_123');
      expect(session?.phraseSnippet).toBe('alpha ... lima');
      expect(session?.createdAt).toBe(now);

      clearVaultSession();
      expect(getVaultSession()).toBeNull();
    });
  });

  describe('pruneInactiveLocalData (90-Day Retention Policy)', () => {
    it('prunes accounts not accessed within 90 days', () => {
      const ninetyOneDaysAgo = Date.now() - (RETENTION_POLICY.INACTIVITY_PRUNE_MS + 1000 * 60 * 60);
      const fiveDaysAgo = Date.now() - (5 * 24 * 60 * 60 * 1000);

      // Expired account
      localStorage.setItem(
        `${STORAGE_KEYS.USER_PREFIX}expired_user`,
        JSON.stringify({ userId: 'expired_user', lastAccessedAt: ninetyOneDaysAgo })
      );

      // Active account
      localStorage.setItem(
        `${STORAGE_KEYS.USER_PREFIX}active_user`,
        JSON.stringify({ userId: 'active_user', lastAccessedAt: fiveDaysAgo })
      );

      const prunedCount = pruneInactiveLocalData();
      expect(prunedCount).toBe(1);
      expect(localStorage.getItem(`${STORAGE_KEYS.USER_PREFIX}expired_user`)).toBeNull();
      expect(localStorage.getItem(`${STORAGE_KEYS.USER_PREFIX}active_user`)).not.toBeNull();
    });
  });

  describe('deleteLocalAccount', () => {
    it('clears active session, user key, and associated trip caches', () => {
      saveVaultSession('user_target', 'word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12', Date.now());
      localStorage.setItem(`${STORAGE_KEYS.USER_PREFIX}user_target`, '{"data":"active"}');
      localStorage.setItem(`${STORAGE_KEYS.TRIP_PREFIX}trip_1`, '{"title":"Trip"}');

      deleteLocalAccount('user_target');

      expect(getVaultSession()).toBeNull();
      expect(localStorage.getItem(`${STORAGE_KEYS.USER_PREFIX}user_target`)).toBeNull();
      expect(localStorage.getItem(`${STORAGE_KEYS.TRIP_PREFIX}trip_1`)).toBeNull();
    });
  });
});

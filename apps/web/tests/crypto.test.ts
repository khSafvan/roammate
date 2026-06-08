import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearVaultSession,
  deleteLocalAccount,
  formatAccountId,
  getVaultSession,
  saveVaultSession,
} from '../src/auth/crypto';

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

describe('Single-User Personal Vault Session', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('persists and retrieves a single-user vault session correctly', () => {
    const now = Date.now();
    saveVaultSession('test-token-123', undefined, now);

    const session = getVaultSession();
    expect(session).not.toBeNull();
    expect(session?.authenticated).toBe(true);

    clearVaultSession();
    expect(getVaultSession()).toBeNull();
  });

  it('formats account id badges correctly', () => {
    expect(formatAccountId()).toBe('Personal Vault');
    expect(formatAccountId('token_1234567890')).toBe('toke...7890');
  });

  it('clears session on deleteLocalAccount', () => {
    saveVaultSession('active_session');
    deleteLocalAccount();
    expect(getVaultSession()).toBeNull();
  });
});

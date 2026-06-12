import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearVaultSession,
  deleteLocalAccount,
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
    saveVaultSession('test-token-123');

    const session = getVaultSession();
    expect(session).not.toBeNull();
    expect(session?.authenticated).toBe(true);
    expect(session?.token).toBe('test-token-123');

    clearVaultSession();
    expect(getVaultSession()).toBeNull();
  });

  it('expires session when expiresAt is in the past', () => {
    const past = Date.now() - 1000;
    saveVaultSession('expired-token', past);

    expect(getVaultSession()).toBeNull();
  });

  it('clears session on deleteLocalAccount', () => {
    saveVaultSession('active_session');
    deleteLocalAccount();
    expect(getVaultSession()).toBeNull();
  });
});

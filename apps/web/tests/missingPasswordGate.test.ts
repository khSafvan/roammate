import { describe, expect, it } from 'vitest';
import { isPasswordConfigured } from '../src/auth/syncService';

describe('Missing PASSWORD Environment Check', () => {
  it('detects when password is missing or configured', async () => {
    const configured = await isPasswordConfigured();
    expect(typeof configured).toBe('boolean');
  });

  it('rejects access if backend reports configured: false and local env has no password', async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (url: string) => {
      if (url.includes('/auth/status') || url.includes('/api/auth/status')) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ configured: false, error: 'PASSWORD not found' }),
        };
      }
      return { ok: false, status: 404 };
    }) as any;

    try {
      // With empty ENV_PASSWORD, check returns false
      const { apiClient } = await import('../src/auth/syncService');
      const status = await apiClient.checkAuthStatus();
      expect(status.configured).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

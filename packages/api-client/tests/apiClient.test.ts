import { describe, expect, it, vi } from 'vitest';
import { ApiClient, ApiError, createApiClient } from '../src/index';

describe('ApiClient', () => {
  it('attaches bearer token from getToken callback', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ userId: 'user-123', createdAt: 1000, lastAccessedAt: 1000 }),
    });

    const client = createApiClient({
      baseUrl: 'https://api.example.com',
      getToken: () => 'test-jwt-token',
      fetchFn: mockFetch as any,
    });

    await client.getMe();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.example.com/me');
    expect(init.headers.get('Authorization')).toBe('Bearer test-jwt-token');
  });

  it('handles auth login successfully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true, token: 'token-abc', userId: 'u-1' }),
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:8787',
      fetchFn: mockFetch as any,
    });

    const res = await client.login({ uuid: 'u-1', passwordHash: 'hash-xyz' });
    expect(res.token).toBe('token-abc');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/auth/login',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ uuid: 'u-1', passwordHash: 'hash-xyz' }),
      })
    );
  });

  it('throws ApiError on failed response', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ error: 'Invalid credentials' }),
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:8787',
      fetchFn: mockFetch as any,
    });

    await expect(client.login({ uuid: 'bad', passwordHash: 'bad' })).rejects.toThrow(ApiError);
  });

  it('handles push and pull sync', async () => {
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes('/sync/pull')) {
        return {
          ok: true,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ serverTimestamp: 2000, records: [] }),
        };
      }
      return {
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ success: true, applied: 1, serverTimestamp: 2000 }),
      };
    });

    const client = new ApiClient({
      baseUrl: 'http://localhost:8787',
      fetchFn: mockFetch as any,
    });

    const pull = await client.pullSync(1000);
    expect(pull.serverTimestamp).toBe(2000);

    const push = await client.pushSync([
      {
        id: 'mut-1',
        entity: 'trip',
        op: 'upsert',
        payload: { id: 'trip-1' },
        clientTimestamp: 1500,
      },
    ]);
    expect(push.applied).toBe(1);
  });
});

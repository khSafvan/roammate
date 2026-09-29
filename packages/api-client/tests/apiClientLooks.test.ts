import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from '../src/index';

describe('ApiClient - Couple Outfit Looks & Uploads API', () => {
  it('calls GET /api/trips/:tripId/events/:eventId/looks correctly', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        looks: [
          {
            id: 'look_1',
            tripId: 'trip_abc',
            eventId: 'stop_1',
            person1Label: 'Linen suit',
            person1UseCutout: true,
            person2UseCutout: true,
            packed: false,
          },
        ],
      }),
    });

    const client = createApiClient({
      baseUrl: 'http://localhost:8787',
      getToken: () => 'test-token',
      fetchFn: mockFetch as any,
    });

    const looks = await client.getEventLooks('trip_abc', 'stop_1');
    expect(looks).toHaveLength(1);
    expect(looks[0].person1Label).toBe('Linen suit');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/api/trips/trip_abc/events/stop_1/looks',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
  });

  it('calls POST /api/trips/:tripId/events/:eventId/looks with look data', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        look: {
          id: 'look_new',
          tripId: 'trip_abc',
          eventId: 'stop_1',
          person1Label: 'Floral dress',
          person1UseCutout: true,
          person2UseCutout: true,
          packed: false,
        },
      }),
    });

    const client = createApiClient({
      baseUrl: 'http://localhost:8787',
      getToken: () => 'test-token',
      fetchFn: mockFetch as any,
    });

    const created = await client.createLook('trip_abc', 'stop_1', {
      person1Label: 'Floral dress',
    });

    expect(created.id).toBe('look_new');
    expect(created.person1Label).toBe('Floral dress');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/api/trips/trip_abc/events/stop_1/looks',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ person1Label: 'Floral dress' }),
      })
    );
  });

  it('calls PATCH /api/looks/:id with partial updates', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        look: {
          id: 'look_1',
          packed: true,
          person1UseCutout: false,
        },
      }),
    });

    const client = createApiClient({
      baseUrl: 'http://localhost:8787',
      getToken: () => 'test-token',
      fetchFn: mockFetch as any,
    });

    const updated = await client.patchLook('look_1', {
      packed: true,
      person1UseCutout: false,
    });

    expect(updated.packed).toBe(true);
    expect(updated.person1UseCutout).toBe(false);
  });

  it('calls DELETE /api/looks/:id', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true }),
    });

    const client = createApiClient({
      baseUrl: 'http://localhost:8787',
      getToken: () => 'test-token',
      fetchFn: mockFetch as any,
    });

    await client.deleteLook('look_1');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8787/api/looks/look_1',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('signs upload URLs via POST /api/uploads/sign', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({
        uploadUrl: 'http://localhost:8787/api/uploads/outfits/123_photo.webp',
        publicUrl: 'http://localhost:8787/api/uploads/outfits/123_photo.webp',
        key: 'outfits/123_photo.webp',
        method: 'PUT',
      }),
    });

    const client = createApiClient({
      baseUrl: 'http://localhost:8787',
      getToken: () => 'test-token',
      fetchFn: mockFetch as any,
    });

    const signResult = await client.signUpload('photo.webp', 'image/webp');
    expect(signResult.uploadUrl).toContain('/api/uploads/outfits/');
    expect(signResult.key).toBe('outfits/123_photo.webp');
  });
});

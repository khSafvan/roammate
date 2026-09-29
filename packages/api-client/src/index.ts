import {
  AuthResponse,
  Look,
  OutboxEntry,
  SyncPullResponse,
  SyncPushResponse,
  Trip,
} from '@mojolog/shared';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: () => string | null | Promise<string | null>;
  fetchFn?: typeof fetch;
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ApiClient {
  private baseUrl: string;
  private getToken?: () => string | null | Promise<string | null>;
  private fetchFn?: typeof fetch;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.getToken = config.getToken;
    this.fetchFn = config.fetchFn;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const headers = new Headers(options.headers || {});

    if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }

    if (!headers.has('Authorization') && this.getToken) {
      const token = await this.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }

    const fetchToUse = this.fetchFn || globalThis.fetch;
    const response = await fetchToUse(url, {
      ...options,
      headers,
    });

    const contentType = response.headers.get('content-type') || '';
    let data: any = null;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    if (!response.ok) {
      const errorMsg = data?.error || data?.message || `HTTP ${response.status}: ${response.statusText}`;
      throw new ApiError(response.status, errorMsg, data);
    }

    return data as T;
  }

  // --- Auth Endpoints ---

  async login(body: { password?: string; passcode?: string }): Promise<AuthResponse> {
    const payload = {
      password: body.password || body.passcode,
      passcode: body.password || body.passcode,
    };
    try {
      return await this.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return await this.request<AuthResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      throw err;
    }
  }

  async getMe(): Promise<{ authenticated: boolean; passwordProtected?: boolean }> {
    try {
      return await this.request<{ authenticated: boolean; passwordProtected?: boolean }>('/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return await this.request<{ authenticated: boolean; passwordProtected?: boolean }>('/api/me');
      }
      throw err;
    }
  }

  async checkAuthStatus(): Promise<{ configured: boolean; error?: string }> {
    try {
      return await this.request<{ configured: boolean; error?: string }>('/auth/status');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return await this.request<{ configured: boolean; error?: string }>('/api/auth/status');
      }
      throw err;
    }
  }

  // --- Sync Endpoints ---

  async pullSync(since = 0): Promise<SyncPullResponse> {
    try {
      return await this.request<SyncPullResponse>(`/sync/pull?since=${since}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return await this.request<SyncPullResponse>(`/api/sync/pull?since=${since}`);
      }
      throw err;
    }
  }

  async pushSync(mutations: OutboxEntry[]): Promise<SyncPushResponse> {
    try {
      return await this.request<SyncPushResponse>('/sync/push', {
        method: 'POST',
        body: JSON.stringify({ mutations }),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return await this.request<SyncPushResponse>('/api/sync/push', {
          method: 'POST',
          body: JSON.stringify({ mutations }),
        });
      }
      throw err;
    }
  }

  // --- Itinerary Direct / Legacy Endpoints ---

  async saveItinerary(
    userIdOrTrip: string | Trip,
    trip?: Trip
  ): Promise<{ success: boolean; message?: string }> {
    const actualTrip = (typeof userIdOrTrip === 'object' ? userIdOrTrip : trip) as Trip;
    const userId = typeof userIdOrTrip === 'string' ? userIdOrTrip : undefined;
    return await this.request<{ success: boolean; message?: string }>('/api/itinerary', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        id: actualTrip.id,
        title: actualTrip.title,
        data: actualTrip,
      }),
    });
  }

  async deleteItinerary(
    tripId: string,
    userId?: string
  ): Promise<{ success: boolean; message?: string }> {
    return await this.request<{ success: boolean; message?: string }>(`/api/itinerary/${tripId}`, {
      method: 'DELETE',
      body: JSON.stringify({ userId }),
    });
  }

  async fetchItineraries(userId?: string): Promise<Trip[]> {
    const endpoint = userId ? `/api/itineraries/${userId}` : '/api/itineraries';
    const res = await this.request<{ itineraries: Array<{ data: Trip }> }>(endpoint);
    return res.itineraries?.map((it) => it.data) || [];
  }

  async fetchSharedTrip(token: string, guestKey?: string): Promise<Trip | null> {
    const query = guestKey ? `?guestKey=${encodeURIComponent(guestKey)}` : '';
    const res = await this.request<{ trip: Trip }>(
      `/api/share/${encodeURIComponent(token)}${query}`
    );
    return res.trip || null;
  }

  // --- Couple Outfit Planner Looks & Uploads Endpoints ---

  async getEventLooks(tripId: string, eventId: string): Promise<Look[]> {
    const res = await this.request<{ looks: Look[] }>(
      `/api/trips/${encodeURIComponent(tripId)}/events/${encodeURIComponent(eventId)}/looks`
    );
    return res.looks || [];
  }

  async createLook(tripId: string, eventId: string, lookData: Partial<Look>): Promise<Look> {
    const res = await this.request<{ look: Look }>(
      `/api/trips/${encodeURIComponent(tripId)}/events/${encodeURIComponent(eventId)}/looks`,
      {
        method: 'POST',
        body: JSON.stringify(lookData),
      }
    );
    return res.look;
  }

  async patchLook(lookId: string, updates: Partial<Look>): Promise<Look> {
    const res = await this.request<{ look: Look }>(
      `/api/looks/${encodeURIComponent(lookId)}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    );
    return res.look;
  }

  async deleteLook(lookId: string): Promise<void> {
    await this.request<{ success: boolean }>(
      `/api/looks/${encodeURIComponent(lookId)}`,
      {
        method: 'DELETE',
      }
    );
  }

  async getTripLooks(tripId: string): Promise<Look[]> {
    const res = await this.request<{ looks: Look[] }>(
      `/api/trips/${encodeURIComponent(tripId)}/looks`
    );
    return res.looks || [];
  }

  async signUpload(
    filename: string,
    contentType: string = 'image/webp'
  ): Promise<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
    method?: string;
    headers?: Record<string, string>;
  }> {
    return await this.request<{
      uploadUrl: string;
      publicUrl: string;
      key: string;
      method?: string;
      headers?: Record<string, string>;
    }>('/api/uploads/sign', {
      method: 'POST',
      body: JSON.stringify({ filename, contentType }),
    });
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

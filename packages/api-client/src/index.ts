import {
  AuthResponse,
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

  async register(body: {
    uuid?: string;
    passwordHash?: string;
    mnemonic?: string;
    userId?: string;
  }): Promise<AuthResponse> {
    try {
      return await this.request<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Fallback for legacy /api prefix
        return await this.request<AuthResponse>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      throw err;
    }
  }

  async login(body: {
    uuid?: string;
    passwordHash?: string;
    phrase?: string;
  }): Promise<AuthResponse> {
    try {
      return await this.request<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return await this.request<AuthResponse>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(body),
        });
      }
      throw err;
    }
  }

  async refresh(): Promise<AuthResponse> {
    try {
      return await this.request<AuthResponse>('/auth/refresh', {
        method: 'POST',
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return await this.request<AuthResponse>('/api/auth/refresh', {
          method: 'POST',
        });
      }
      throw err;
    }
  }

  async getMe(): Promise<{ userId: string; createdAt: number; lastAccessedAt: number }> {
    try {
      return await this.request<{ userId: string; createdAt: number; lastAccessedAt: number }>('/me');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return await this.request<{ userId: string; createdAt: number; lastAccessedAt: number }>('/api/me');
      }
      throw err;
    }
  }

  async deleteAccount(body: {
    userId: string;
    phrase?: string;
    passwordHash?: string;
  }): Promise<{ success: boolean; message?: string }> {
    try {
      return await this.request<{ success: boolean; message?: string }>('/auth/account', {
        method: 'DELETE',
        body: JSON.stringify(body),
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return await this.request<{ success: boolean; message?: string }>('/api/auth/account', {
          method: 'DELETE',
          body: JSON.stringify(body),
        });
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
    userId: string,
    trip: Trip
  ): Promise<{ success: boolean; message?: string }> {
    return await this.request<{ success: boolean; message?: string }>('/api/itinerary', {
      method: 'POST',
      body: JSON.stringify({
        userId,
        id: trip.id,
        title: trip.title,
        data: trip,
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

  async fetchItineraries(userId: string): Promise<Trip[]> {
    const res = await this.request<{ itineraries: Array<{ data: Trip }> }>(
      `/api/itineraries/${userId}`
    );
    return res.itineraries?.map((it) => it.data) || [];
  }

  async fetchSharedTrip(token: string, guestKey?: string): Promise<Trip | null> {
    const query = guestKey ? `?guestKey=${encodeURIComponent(guestKey)}` : '';
    const res = await this.request<{ trip: Trip }>(
      `/api/share/${encodeURIComponent(token)}${query}`
    );
    return res.trip || null;
  }
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

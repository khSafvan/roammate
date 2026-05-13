import { ApiClient } from '@mojolog/api-client';
import { OutboxEntry, SyncOperation, SyncRecord } from '@mojolog/shared';

export interface SyncStorage {
  getItem(key: string): Promise<string | null> | string | null;
  setItem(key: string, value: string): Promise<void> | void;
  removeItem(key: string): Promise<void> | void;
}

export class MemorySyncStorage implements SyncStorage {
  private data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) || null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

export class LocalStorageSyncStorage implements SyncStorage {
  getItem(key: string): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  }
  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  }
  removeItem(key: string): void {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  }
}

export interface SyncEngineConfig {
  storage?: SyncStorage;
  apiClient: ApiClient;
  onRecordApplied?: (record: SyncRecord) => Promise<void> | void;
  storagePrefix?: string;
}

export interface SyncExecutionResult {
  success: boolean;
  pushed: number;
  pulled: number;
  serverTimestamp: number;
  error?: string;
}

export class SyncEngine {
  private storage: SyncStorage;
  private apiClient: ApiClient;
  private onRecordApplied?: (record: SyncRecord) => Promise<void> | void;
  private prefix: string;

  constructor(config: SyncEngineConfig) {
    this.storage = config.storage || (typeof localStorage !== 'undefined' ? new LocalStorageSyncStorage() : new MemorySyncStorage());
    this.apiClient = config.apiClient;
    this.onRecordApplied = config.onRecordApplied;
    this.prefix = config.storagePrefix || 'mojolog_sync';
  }

  private outboxKey(): string {
    return `${this.prefix}_outbox`;
  }

  private lastSyncKey(): string {
    return `${this.prefix}_last_sync`;
  }

  async getOutbox(): Promise<OutboxEntry[]> {
    const raw = await this.storage.getItem(this.outboxKey());
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async enqueue(
    entity: string,
    op: SyncOperation,
    payload: any,
    id?: string
  ): Promise<OutboxEntry> {
    const entryId = id || payload?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mut_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const entry: OutboxEntry = {
      id: entryId,
      entity,
      op,
      payload,
      clientTimestamp: Date.now(),
    };

    const outbox = await this.getOutbox();
    // Coalesce mutations for the same entity and ID: if an older pending mutation exists, replace it
    const existingIdx = outbox.findIndex((e) => e.entity === entity && e.id === entryId);
    if (existingIdx >= 0) {
      outbox[existingIdx] = entry;
    } else {
      outbox.push(entry);
    }

    await this.storage.setItem(this.outboxKey(), JSON.stringify(outbox));
    return entry;
  }

  async clearOutbox(entryIds?: string[]): Promise<void> {
    if (!entryIds) {
      await this.storage.removeItem(this.outboxKey());
      return;
    }
    const current = await this.getOutbox();
    const filtered = current.filter((e) => !entryIds.includes(e.id));
    await this.storage.setItem(this.outboxKey(), JSON.stringify(filtered));
  }

  async getLastSyncTimestamp(): Promise<number> {
    const raw = await this.storage.getItem(this.lastSyncKey());
    return raw ? parseInt(raw, 10) || 0 : 0;
  }

  async setLastSyncTimestamp(ts: number): Promise<void> {
    await this.storage.setItem(this.lastSyncKey(), ts.toString());
  }

  /**
   * Conflict rule: Last-write-wins per record using server timestamps.
   */
  resolveConflict<T extends { updatedAt?: number }>(
    clientRecord: T | null | undefined,
    serverRecord: T,
    serverTimestamp?: number
  ): { winner: 'server' | 'client'; record: T } {
    if (!clientRecord) {
      return { winner: 'server', record: serverRecord };
    }

    const clientTime = clientRecord.updatedAt || 0;
    const serverTime = serverRecord.updatedAt || serverTimestamp || 0;

    if (serverTime >= clientTime) {
      return { winner: 'server', record: serverRecord };
    }
    return { winner: 'client', record: clientRecord };
  }

  /**
   * Executes push of pending outbox entries followed by pull of remote updates
   */
  async sync(): Promise<SyncExecutionResult> {
    let pushed = 0;
    let pulled = 0;
    let serverTimestamp = Date.now();

    try {
      // 1. Push Phase
      const outbox = await this.getOutbox();
      if (outbox.length > 0) {
        const pushRes = await this.apiClient.pushSync(outbox);
        if (pushRes.success) {
          pushed = pushRes.applied || outbox.length;
          serverTimestamp = pushRes.serverTimestamp || serverTimestamp;
          const pushedIds = outbox.map((e) => e.id);
          await this.clearOutbox(pushedIds);
        }
      }

      // 2. Pull Phase
      const since = await this.getLastSyncTimestamp();
      const pullRes = await this.apiClient.pullSync(since);

      if (pullRes && Array.isArray(pullRes.records)) {
        serverTimestamp = pullRes.serverTimestamp || serverTimestamp;
        for (const record of pullRes.records) {
          if (this.onRecordApplied) {
            await this.onRecordApplied(record);
          }
          pulled++;
        }
        await this.setLastSyncTimestamp(serverTimestamp);
      }

      return {
        success: true,
        pushed,
        pulled,
        serverTimestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        pushed,
        pulled,
        serverTimestamp,
        error: err?.message || 'Sync failed: network unavailable',
      };
    }
  }
}

export function createSyncEngine(config: SyncEngineConfig): SyncEngine {
  return new SyncEngine(config);
}

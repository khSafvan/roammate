import { describe, expect, it, vi } from 'vitest';
import { ApiClient } from '@mojolog/api-client';
import { MemorySyncStorage, SyncEngine } from '../src/index';
import { SyncRecord } from '@mojolog/shared';

describe('SyncEngine (packages/sync)', () => {
  it('enqueues outbox entries and coalesces updates for the same entity id', async () => {
    const storage = new MemorySyncStorage();
    const mockApiClient = {} as ApiClient;
    const engine = new SyncEngine({ storage, apiClient: mockApiClient });

    await engine.enqueue('trip', 'upsert', { id: 'trip-1', title: 'Draft 1' });
    let outbox = await engine.getOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].payload.title).toBe('Draft 1');

    // Updating same entity replaces older pending mutation in outbox
    await engine.enqueue('trip', 'upsert', { id: 'trip-1', title: 'Draft 2' });
    outbox = await engine.getOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].payload.title).toBe('Draft 2');

    // Adding another entity appends
    await engine.enqueue('trip', 'delete', { id: 'trip-2' });
    outbox = await engine.getOutbox();
    expect(outbox).toHaveLength(2);
  });

  it('preserves outbox when network is offline during sync', async () => {
    const storage = new MemorySyncStorage();
    const mockApiClient = {
      pushSync: vi.fn().mockRejectedValue(new Error('Network error: failed to fetch')),
      pullSync: vi.fn(),
    } as unknown as ApiClient;

    const engine = new SyncEngine({ storage, apiClient: mockApiClient });
    await engine.enqueue('trip', 'upsert', { id: 'trip-offline', title: 'Saved Offline' });

    const result = await engine.sync();
    expect(result.success).toBe(false);
    expect(result.pushed).toBe(0);

    // Outbox was NOT cleared on failure
    const outbox = await engine.getOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0].id).toBe('trip-offline');
  });

  it('pushes pending outbox entries and pulls remote records successfully', async () => {
    const storage = new MemorySyncStorage();
    const appliedRecords: SyncRecord[] = [];

    const mockApiClient = {
      pushSync: vi.fn().mockResolvedValue({
        success: true,
        applied: 1,
        serverTimestamp: 5000,
      }),
      pullSync: vi.fn().mockResolvedValue({
        serverTimestamp: 5000,
        records: [
          {
            id: 'trip-remote',
            entity: 'trip',
            op: 'upsert',
            data: { id: 'trip-remote', title: 'Remote Trip', updatedAt: 4800 },
            updatedAt: 4800,
          },
        ],
      }),
    } as unknown as ApiClient;

    const engine = new SyncEngine({
      storage,
      apiClient: mockApiClient,
      onRecordApplied: (record) => {
        appliedRecords.push(record);
      },
    });

    await engine.enqueue('trip', 'upsert', { id: 'trip-local', title: 'Local Trip' });

    const result = await engine.sync();
    expect(result.success).toBe(true);
    expect(result.pushed).toBe(1);
    expect(result.pulled).toBe(1);
    expect(appliedRecords).toHaveLength(1);
    expect(appliedRecords[0].id).toBe('trip-remote');

    // Outbox is now cleared
    const outbox = await engine.getOutbox();
    expect(outbox).toHaveLength(0);

    // Last sync timestamp updated
    const lastSync = await engine.getLastSyncTimestamp();
    expect(lastSync).toBe(5000);
  });

  describe('Conflict Resolution (Last-Write-Wins)', () => {
    it('server record wins when server timestamp is newer or equal', () => {
      const storage = new MemorySyncStorage();
      const engine = new SyncEngine({ storage, apiClient: {} as any });

      const clientRecord = { id: 't1', title: 'Local Edit', updatedAt: 1000 };
      const serverRecord = { id: 't1', title: 'Server Edit', updatedAt: 2000 };

      const outcome = engine.resolveConflict(clientRecord, serverRecord);
      expect(outcome.winner).toBe('server');
      expect(outcome.record.title).toBe('Server Edit');
    });

    it('client record wins when client timestamp is strictly newer', () => {
      const storage = new MemorySyncStorage();
      const engine = new SyncEngine({ storage, apiClient: {} as any });

      const clientRecord = { id: 't1', title: 'Newer Local Edit', updatedAt: 3000 };
      const serverRecord = { id: 't1', title: 'Older Server Edit', updatedAt: 2000 };

      const outcome = engine.resolveConflict(clientRecord, serverRecord);
      expect(outcome.winner).toBe('client');
      expect(outcome.record.title).toBe('Newer Local Edit');
    });

    it('server record wins when client has no prior record', () => {
      const storage = new MemorySyncStorage();
      const engine = new SyncEngine({ storage, apiClient: {} as any });

      const serverRecord = { id: 't1', title: 'Brand New Server Trip', updatedAt: 2000 };
      const outcome = engine.resolveConflict(null, serverRecord);
      expect(outcome.winner).toBe('server');
      expect(outcome.record.title).toBe('Brand New Server Trip');
    });
  });
});

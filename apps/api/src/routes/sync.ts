import { Hono } from 'hono';
import { createClient } from '@libsql/client/web';
import { type SyncRecord, type OutboxEntry } from '@roammate/shared';
import { verifyAuth, ensureTables, type Bindings } from '../index';

export const syncRouter = new Hono<{ Bindings: Bindings }>();

const handleSyncPull = async (c: any) => {
  if (!(await verifyAuth(c))) {
    return c.json({ error: 'Unauthorized: valid password required' }, 401);
  }

  const since = parseInt(c.req.query('since') || '0', 10);
  const serverTimestamp = Date.now();

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ serverTimestamp, records: [] });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await ensureTables(turso);

  const result = await turso.execute({
    sql: `SELECT id, data, updated_at, deleted_at 
          FROM trips 
          WHERE updated_at > ? 
          ORDER BY updated_at ASC`,
    args: [since],
  });

  const records: SyncRecord[] = result.rows.map((row) => {
    const isDeleted = row.deleted_at !== null && row.deleted_at !== undefined;
    return {
      id: row.id as string,
      entity: 'trip',
      op: isDeleted ? 'delete' : 'upsert',
      data: isDeleted ? { id: row.id } : JSON.parse(row.data as string),
      updatedAt: (row.updated_at as number) || serverTimestamp,
    };
  });

  return c.json({ serverTimestamp, records });
};

syncRouter.get('/pull', handleSyncPull);

const handleSyncPush = async (c: any) => {
  if (!(await verifyAuth(c))) {
    return c.json({ error: 'Unauthorized: valid password required' }, 401);
  }

  const body = await c.req.json().catch(() => ({}));
  const mutations: OutboxEntry[] = Array.isArray(body.mutations) ? body.mutations : [];
  const serverTimestamp = Date.now();

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ success: true, applied: mutations.length, serverTimestamp });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await ensureTables(turso);

  try {
    const stmts = [];
    for (const mut of mutations) {
      if (mut.entity === 'trip' || mut.entity === 'itinerary') {
        if (mut.op === 'delete') {
          stmts.push({
            sql: `UPDATE trips 
                  SET deleted_at = ?, updated_at = ? 
                  WHERE id = ?`,
            args: [serverTimestamp, serverTimestamp, mut.id],
          });
        } else {
          const payload = mut.payload || {};
          const title = payload.title || 'My Trip';
          const destination = payload.destination || '';
          stmts.push({
            sql: `INSERT INTO trips (id, title, destination, start_date, end_date, data, updated_at, deleted_at) 
                  VALUES (?, ?, ?, ?, ?, ?, ?, NULL)
                  ON CONFLICT(id) DO UPDATE SET 
                    title = excluded.title, 
                    destination = excluded.destination,
                    start_date = excluded.start_date,
                    end_date = excluded.end_date,
                    data = excluded.data, 
                    updated_at = excluded.updated_at,
                    deleted_at = NULL`,
            args: [
              mut.id,
              title,
              destination,
              payload.startDate || null,
              payload.endDate || null,
              JSON.stringify(payload),
              serverTimestamp,
            ],
          });
        }
      }
    }
    
    if (stmts.length > 0) {
      await turso.batch(stmts, "write");
    }
    return c.json({ success: true, applied: mutations.length, serverTimestamp });
  } catch (err) {
    console.error('Sync push failed:', err);
    return c.json({ error: 'Failed to process sync batch', details: (err as Error).message }, 500);
  }
};

syncRouter.post('/push', handleSyncPush);

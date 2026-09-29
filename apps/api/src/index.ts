import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { Client, createClient } from '@libsql/client/web';
import { OutboxEntry, SyncRecord } from '@mojolog/shared';

type Bindings = {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  PASSWORD?: string;
  PASSCODE?: string;
  AUTH_PASSCODE?: string;
  JWT_SECRET?: string;
  ALLOWED_ORIGINS?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Configurable CORS for Allowed Web Origins
app.use('*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS;
  const corsHandler = cors({
    origin: (clientOrigin) => {
      if (!allowed || allowed === '*') return clientOrigin || '*';
      const origins = allowed.split(',').map((o) => o.trim());
      return origins.includes(clientOrigin) ? clientOrigin : origins[0];
    },
    allowHeaders: ['Content-Type', 'Authorization', 'X-Password', 'X-Passcode'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  });
  return corsHandler(c, next);
});

// Helper: Configured Password
function getPassword(c: any): string | null {
  return c.env.PASSWORD || c.env.PASSCODE || c.env.AUTH_PASSCODE || null;
}

// Helper: JWT Secret
function getJwtSecret(c: any): string {
  return c.env.JWT_SECRET || 'roammate-edge-default-secret-key';
}

// Helper: Bearer / Password Auth Guard
async function verifyAuth(c: any): Promise<boolean> {
  const required = getPassword(c);
  if (!required) return false;

  const authHeader = c.req.header('Authorization');
  const customHeader = c.req.header('X-Password') || c.req.header('X-Passcode');
  const queryPassword = c.req.query('password') || c.req.query('passcode');

  if (customHeader === required || queryPassword === required) {
    return true;
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === required) return true;
    try {
      const payload = await verify(token, getJwtSecret(c), 'HS256');
      if (payload && payload.authenticated === true) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

// Helper: Auto-ensure single-user trips table exists
async function ensureTables(turso: Client): Promise<void> {
  try {
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS trips (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        destination TEXT,
        start_date TEXT,
        end_date TEXT,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        deleted_at INTEGER
      )
    `);
    try {
      await turso.execute('CREATE INDEX IF NOT EXISTS idx_trips_updated ON trips(updated_at)');
    } catch {}
    // Seamless legacy migration if itineraries table exists
    try {
      await turso.execute(`
        INSERT OR IGNORE INTO trips (id, title, destination, start_date, end_date, data, updated_at, deleted_at)
        SELECT id, title, '', start_date, end_date, data, updated_at, deleted_at FROM itineraries
      `);
    } catch {}
  } catch (e) {
    console.warn('Table initialization notice:', e);
  }
}

// --- Auth Endpoints ---

// 1. Password Login (POST /auth/login)
const handleLogin = async (c: any) => {
  let body: { password?: string; passcode?: string } = {};
  try {
    body = await c.req.json();
  } catch {}

  const required = getPassword(c);
  const input = (body.password || body.passcode || '').trim();

  if (!required) {
    return c.json({ error: 'PASSWORD is not configured on the backend. Please set PASSWORD in Worker secrets.' }, 401);
  }

  if (!input || input !== required) {
    return c.json({ error: 'Incorrect password' }, 401);
  }

  const token = await sign(
    { authenticated: true, iat: Math.floor(Date.now() / 1000) },
    getJwtSecret(c)
  );

  return c.json({
    success: true,
    token,
    authenticated: true,
  });
};

app.post('/auth/login', handleLogin);
app.post('/api/auth/login', handleLogin);

// 2. Get Current Status (/me)
const handleMe = async (c: any) => {
  const isAuth = await verifyAuth(c);
  const required = getPassword(c);

  if (!isAuth) {
    return c.json({ authenticated: false, passwordProtected: !!required }, 401);
  }

  return c.json({ authenticated: true, passwordProtected: !!required });
};

app.get('/me', handleMe);
app.get('/api/me', handleMe);

// --- Sync Routes (Offline Push / Pull) ---

// 3. Pull Sync: GET /sync/pull?since=...
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

app.get('/sync/pull', handleSyncPull);
app.get('/api/sync/pull', handleSyncPull);

// 4. Push Sync: POST /sync/push
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

  for (const mut of mutations) {
    if (mut.entity === 'trip' || mut.entity === 'itinerary') {
      if (mut.op === 'delete') {
        await turso.execute({
          sql: `UPDATE trips 
                SET deleted_at = ?, updated_at = ? 
                WHERE id = ?`,
          args: [serverTimestamp, serverTimestamp, mut.id],
        });
      } else {
        const payload = mut.payload || {};
        const title = payload.title || 'My Trip';
        const destination = payload.destination || '';
        await turso.execute({
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

  return c.json({ success: true, applied: mutations.length, serverTimestamp });
};

app.post('/sync/push', handleSyncPush);
app.post('/api/sync/push', handleSyncPush);

// --- Direct Trips Endpoints ---

// 5. Save Trip: POST /api/itinerary
app.post('/api/itinerary', async (c) => {
  if (!(await verifyAuth(c))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const body = await c.req.json();
  const { id, title, data } = body;

  if (!id || !data) {
    return c.json({ error: 'Missing required trip fields' }, 400);
  }

  const now = Date.now();

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ success: true, status: 'local_mode' });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await ensureTables(turso);

  await turso.execute({
    sql: `INSERT INTO trips (id, title, destination, data, updated_at, deleted_at) 
          VALUES (?, ?, ?, ?, ?, NULL)
          ON CONFLICT(id) DO UPDATE SET 
            title = excluded.title, 
            destination = excluded.destination,
            data = excluded.data, 
            updated_at = excluded.updated_at,
            deleted_at = NULL`,
    args: [id, title || 'My Trip', data.destination || '', JSON.stringify(data), now],
  });

  return c.json({ success: true });
});

// 6. Delete Trip: DELETE /api/itinerary/:id
app.delete('/api/itinerary/:id', async (c) => {
  if (!(await verifyAuth(c))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const id = c.req.param('id');
  if (!id) {
    return c.json({ error: 'Missing trip ID' }, 400);
  }

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ success: true, status: 'local_mode' });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await turso.execute({
    sql: 'DELETE FROM trips WHERE id = ?',
    args: [id],
  });

  return c.json({ success: true, message: 'Trip deleted' });
});

// 7. Fetch All Trips: GET /api/itineraries
const handleFetchItineraries = async (c: any) => {
  if (!(await verifyAuth(c))) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ itineraries: [] });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await ensureTables(turso);

  const result = await turso.execute({
    sql: 'SELECT id, title, data, updated_at FROM trips WHERE deleted_at IS NULL ORDER BY updated_at DESC',
    args: [],
  });

  const itineraries = result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    data: JSON.parse(row.data as string),
    updated_at: row.updated_at,
  }));

  return c.json({ itineraries });
};

app.get('/api/itineraries', handleFetchItineraries);

// 8. Public Share View: GET /api/share/:token
const handleShare = async (c: any) => {
  const token = c.req.param('token');

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ error: 'Database unconfigured' }, 503);
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  const result = await turso.execute({
    sql: `SELECT data FROM trips 
          WHERE (id = ? OR json_extract(data, '$.shareToken') = ?)
            AND deleted_at IS NULL
          LIMIT 1`,
    args: [token, token],
  });

  if (result.rows.length === 0) {
    return c.json({ error: 'Shared trip not found' }, 404);
  }

  const tripData = JSON.parse(result.rows[0].data as string);
  return c.json({ trip: tripData, readOnly: true });
};

app.get('/share/:token', handleShare);
app.get('/api/share/:token', handleShare);

export default app;

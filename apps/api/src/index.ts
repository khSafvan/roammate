import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { Client, createClient } from '@libsql/client/web';
import { validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { OutboxEntry, RETENTION_POLICY, SyncRecord } from '@mojolog/shared';

type Bindings = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
  JWT_SECRET?: string;
  ALLOWED_ORIGINS?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// 3-Month Inactivity Retention Policy (90 days in ms)
const THREE_MONTHS_MS = RETENTION_POLICY.INACTIVITY_PRUNE_MS;
const JWT_EXPIRES_IN_SEC = 7 * 24 * 60 * 60; // 7 days

// Configurable CORS for Allowed Web Origins
app.use('*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS;
  const corsHandler = cors({
    origin: (clientOrigin) => {
      if (!allowed || allowed === '*') return clientOrigin || '*';
      const origins = allowed.split(',').map((o) => o.trim());
      return origins.includes(clientOrigin) ? clientOrigin : origins[0];
    },
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    exposeHeaders: ['Content-Length'],
    maxAge: 600,
  });
  return corsHandler(c, next);
});

// Helper: One-way hash the mnemonic phrase using native Web Crypto SHA-256
async function hashPhrase(phrase: string): Promise<string> {
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Helper: JWT Bearer Token Issuance
async function issueToken(
  userId: string,
  secret: string
): Promise<{ token: string; expiresAt: number }> {
  const nowSec = Math.floor(Date.now() / 1000);
  const expSec = nowSec + JWT_EXPIRES_IN_SEC;
  const token = await sign(
    {
      sub: userId,
      exp: expSec,
      iat: nowSec,
    },
    secret
  );
  return { token, expiresAt: expSec * 1000 };
}

// Helper: Extract & Verify Bearer Token User ID
async function getAuthUserId(c: any): Promise<string | null> {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const secret = c.env.JWT_SECRET || 'roammate-edge-default-secret-key-change-in-prod';
      const payload = await verify(token, secret, 'HS256');
      if (payload && payload.sub) {
        return payload.sub as string;
      }
    } catch {
      return null;
    }
  }
  return null;
}

// Helper: Auto-delete accounts & itineraries not accessed in 3 months
async function pruneExpiredAccounts(turso: Client): Promise<{ deletedUsers: number; deletedItineraries: number }> {
  try {
    const cutoff = Date.now() - THREE_MONTHS_MS;
    const itinRes = await turso.execute({
      sql: `DELETE FROM itineraries 
            WHERE user_id IN (SELECT id FROM users WHERE last_accessed_at < ?)
               OR last_accessed_at < ?`,
      args: [cutoff, cutoff],
    });

    const userRes = await turso.execute({
      sql: 'DELETE FROM users WHERE last_accessed_at < ?',
      args: [cutoff],
    });

    return {
      deletedUsers: userRes.rowsAffected || 0,
      deletedItineraries: itinRes.rowsAffected || 0,
    };
  } catch (err) {
    console.warn('Prune error (non-fatal):', err);
    return { deletedUsers: 0, deletedItineraries: 0 };
  }
}

// Helper: Auto-ensure tables and columns exist idempotently
async function ensureTables(turso: Client): Promise<void> {
  try {
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        password_hash TEXT,
        created_at INTEGER NOT NULL,
        last_accessed_at INTEGER NOT NULL
      )
    `);
    try {
      await turso.execute('ALTER TABLE users ADD COLUMN password_hash TEXT');
    } catch {}

    await turso.execute(`
      CREATE TABLE IF NOT EXISTS itineraries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        start_date TEXT,
        end_date TEXT,
        data TEXT NOT NULL,
        updated_at INTEGER NOT NULL,
        last_accessed_at INTEGER NOT NULL,
        deleted_at INTEGER
      )
    `);
    try {
      await turso.execute('ALTER TABLE itineraries ADD COLUMN deleted_at INTEGER');
    } catch {}

    try {
      await turso.execute('CREATE INDEX IF NOT EXISTS idx_itineraries_sync ON itineraries(user_id, updated_at)');
    } catch {}
  } catch (e) {
    console.warn('Table initialization notice:', e);
  }
}

// --- Auth Endpoints ---

// 1. Register
const handleRegister = async (c: any) => {
  let body: { uuid?: string; passwordHash?: string; mnemonic?: string; userId?: string } = {};
  try {
    body = await c.req.json();
  } catch {}

  const now = Date.now();
  const userId = body.uuid || body.userId || (body.mnemonic ? await hashPhrase(body.mnemonic) : crypto.randomUUID());
  const passwordHash = body.passwordHash || null;
  const jwtSecret = c.env.JWT_SECRET || 'roammate-edge-default-secret-key-change-in-prod';
  const { token, expiresAt } = await issueToken(userId, jwtSecret);

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ success: true, token, userId, uuid: userId, expiresAt, lastAccessedAt: now, status: 'local_mode' });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await ensureTables(turso);
  await pruneExpiredAccounts(turso);

  await turso.execute({
    sql: `INSERT INTO users (id, password_hash, created_at, last_accessed_at) 
          VALUES (?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET 
            password_hash = coalesce(excluded.password_hash, users.password_hash),
            last_accessed_at = excluded.last_accessed_at`,
    args: [userId, passwordHash, now, now],
  });

  return c.json({ success: true, token, userId, uuid: userId, expiresAt, lastAccessedAt: now });
};

app.post('/auth/register', handleRegister);
app.post('/api/auth/register', handleRegister);

// 2. Login
const handleLogin = async (c: any) => {
  let body: { uuid?: string; passwordHash?: string; phrase?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON request body' }, 400);
  }

  const now = Date.now();
  let userId: string;
  const passwordHash = body.passwordHash;

  if (body.uuid) {
    userId = body.uuid.trim().toLowerCase();
  } else if (body.phrase) {
    const clean = body.phrase.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!validateMnemonic(clean, wordlist)) {
      return c.json({ error: 'Invalid BIP-39 recovery phrase' }, 400);
    }
    userId = await hashPhrase(clean);
  } else {
    return c.json({ error: 'Missing account UUID or credentials' }, 400);
  }

  const jwtSecret = c.env.JWT_SECRET || 'roammate-edge-default-secret-key-change-in-prod';
  const { token, expiresAt } = await issueToken(userId, jwtSecret);

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ success: true, token, userId, uuid: userId, expiresAt, lastAccessedAt: now, status: 'local_mode' });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await ensureTables(turso);
  await pruneExpiredAccounts(turso);

  const user = await turso.execute({
    sql: 'SELECT id, password_hash, last_accessed_at FROM users WHERE id = ?',
    args: [userId],
  });

  if (user.rows.length === 0) {
    // Auto-provision user account row
    await turso.execute({
      sql: 'INSERT INTO users (id, password_hash, created_at, last_accessed_at) VALUES (?, ?, ?, ?)',
      args: [userId, passwordHash || null, now, now],
    });
  } else {
    const storedHash = user.rows[0].password_hash as string | null;
    if (storedHash && passwordHash && storedHash !== passwordHash) {
      return c.json({ error: 'Incorrect account credentials' }, 401);
    }
    await turso.execute({
      sql: 'UPDATE users SET last_accessed_at = ? WHERE id = ?',
      args: [now, userId],
    });
  }

  return c.json({ success: true, token, userId, uuid: userId, expiresAt, lastAccessedAt: now });
};

app.post('/auth/login', handleLogin);
app.post('/api/auth/login', handleLogin);

// 3. Refresh Token
const handleRefresh = async (c: any) => {
  const userId = await getAuthUserId(c);
  if (!userId) {
    return c.json({ error: 'Valid Bearer token required for token refresh' }, 401);
  }

  const jwtSecret = c.env.JWT_SECRET || 'roammate-edge-default-secret-key-change-in-prod';
  const { token, expiresAt } = await issueToken(userId, jwtSecret);

  return c.json({ success: true, token, userId, expiresAt });
};

app.post('/auth/refresh', handleRefresh);
app.post('/api/auth/refresh', handleRefresh);

// 4. Get Current User (/me)
const handleMe = async (c: any) => {
  const userId = await getAuthUserId(c);
  if (!userId) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const now = Date.now();
  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ userId, createdAt: now, lastAccessedAt: now });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await turso.execute({
    sql: 'UPDATE users SET last_accessed_at = ? WHERE id = ?',
    args: [now, userId],
  });

  const res = await turso.execute({
    sql: 'SELECT id, created_at, last_accessed_at FROM users WHERE id = ?',
    args: [userId],
  });

  if (res.rows.length === 0) {
    return c.json({ userId, createdAt: now, lastAccessedAt: now });
  }

  return c.json({
    userId: res.rows[0].id,
    createdAt: res.rows[0].created_at,
    lastAccessedAt: res.rows[0].last_accessed_at,
  });
};

app.get('/me', handleMe);
app.get('/api/me', handleMe);

// 5. Delete Account
const handleDeleteAccount = async (c: any) => {
  let authUserId = await getAuthUserId(c);
  const body = await c.req.json().catch(() => ({}));
  const userId = authUserId || body.userId;

  if (!userId) {
    return c.json({ error: 'Missing userId or authorization' }, 400);
  }

  if (body.phrase && body.phrase.includes(' ')) {
    const derivedId = await hashPhrase(body.phrase);
    if (derivedId !== userId) {
      return c.json({ error: 'Phrase does not match account User ID' }, 403);
    }
  }

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ success: true, status: 'local_mode_deleted' });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await ensureTables(turso);

  if (body.passwordHash) {
    const userRes = await turso.execute({
      sql: 'SELECT password_hash FROM users WHERE id = ?',
      args: [userId],
    });
    if (userRes.rows.length > 0 && userRes.rows[0].password_hash) {
      if (userRes.rows[0].password_hash !== body.passwordHash) {
        return c.json({ error: 'Invalid credentials for account deletion' }, 403);
      }
    }
  }

  await turso.execute({
    sql: 'DELETE FROM itineraries WHERE user_id = ?',
    args: [userId],
  });

  await turso.execute({
    sql: 'DELETE FROM users WHERE id = ?',
    args: [userId],
  });

  return c.json({ success: true, message: 'Account and all data permanently deleted' });
};

app.delete('/auth/account', handleDeleteAccount);
app.delete('/api/auth/account', handleDeleteAccount);

// --- Sync Routes (Offline Push / Pull) ---

// 6. Pull Sync: GET /sync/pull?since=...
const handleSyncPull = async (c: any) => {
  const userId = (await getAuthUserId(c)) || c.req.query('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized: valid token required' }, 401);
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
          FROM itineraries 
          WHERE user_id = ? AND updated_at > ? 
          ORDER BY updated_at ASC`,
    args: [userId, since],
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

// 7. Push Sync: POST /sync/push
const handleSyncPush = async (c: any) => {
  const userId = (await getAuthUserId(c)) || c.req.query('userId');
  if (!userId) {
    return c.json({ error: 'Unauthorized: valid token required' }, 401);
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

  // Apply mutations with last-write-wins using server timestamp
  for (const mut of mutations) {
    if (mut.entity === 'trip' || mut.entity === 'itinerary') {
      if (mut.op === 'delete') {
        await turso.execute({
          sql: `UPDATE itineraries 
                SET deleted_at = ?, updated_at = ?, last_accessed_at = ? 
                WHERE id = ? AND user_id = ?`,
          args: [serverTimestamp, serverTimestamp, serverTimestamp, mut.id, userId],
        });
      } else {
        const payload = mut.payload || {};
        const title = payload.title || 'My Trip';
        await turso.execute({
          sql: `INSERT INTO itineraries (id, user_id, title, start_date, end_date, data, updated_at, last_accessed_at, deleted_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
                ON CONFLICT(id) DO UPDATE SET 
                  title = excluded.title, 
                  start_date = excluded.start_date,
                  end_date = excluded.end_date,
                  data = excluded.data, 
                  updated_at = excluded.updated_at,
                  last_accessed_at = excluded.last_accessed_at,
                  deleted_at = NULL`,
          args: [
            mut.id,
            userId,
            title,
            payload.startDate || null,
            payload.endDate || null,
            JSON.stringify(payload),
            serverTimestamp,
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

// --- Direct / Legacy Itinerary Endpoints ---

// 8. Save Itinerary: POST /api/itinerary
app.post('/api/itinerary', async (c) => {
  const authUserId = await getAuthUserId(c);
  const body = await c.req.json();
  const userId = authUserId || body.userId;
  const { id, title, data } = body;

  if (!userId || !id || !data) {
    return c.json({ error: 'Missing required itinerary fields' }, 400);
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
  await pruneExpiredAccounts(turso);

  await turso.execute({
    sql: 'UPDATE users SET last_accessed_at = ? WHERE id = ?',
    args: [now, userId],
  });

  await turso.execute({
    sql: `INSERT INTO itineraries (id, user_id, title, data, updated_at, last_accessed_at, deleted_at) 
          VALUES (?, ?, ?, ?, ?, ?, NULL)
          ON CONFLICT(id) DO UPDATE SET 
            title = excluded.title, 
            data = excluded.data, 
            updated_at = excluded.updated_at,
            last_accessed_at = excluded.last_accessed_at,
            deleted_at = NULL`,
    args: [id, userId, title || 'My Trip', JSON.stringify(data), now, now],
  });

  return c.json({ success: true });
});

// 9. Delete Itinerary: DELETE /api/itinerary/:id
app.delete('/api/itinerary/:id', async (c) => {
  const id = c.req.param('id');
  const authUserId = await getAuthUserId(c);
  let userId: string | undefined = authUserId || undefined;
  if (!userId) {
    try {
      const body = await c.req.json();
      userId = body.userId;
    } catch {}
  }

  if (!id) {
    return c.json({ error: 'Missing itinerary ID' }, 400);
  }

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ success: true, status: 'local_mode' });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  if (userId) {
    await turso.execute({
      sql: 'DELETE FROM itineraries WHERE id = ? AND user_id = ?',
      args: [id, userId],
    });
  } else {
    await turso.execute({
      sql: 'DELETE FROM itineraries WHERE id = ?',
      args: [id],
    });
  }

  return c.json({ success: true, message: 'Itinerary deleted' });
});

// 10. Fetch Itineraries: GET /api/itineraries/:userId
app.get('/api/itineraries/:userId', async (c) => {
  const userId = c.req.param('userId');

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ itineraries: [] });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await turso.execute({
    sql: 'UPDATE users SET last_accessed_at = ? WHERE id = ?',
    args: [Date.now(), userId],
  });

  const result = await turso.execute({
    sql: 'SELECT id, title, data, updated_at FROM itineraries WHERE user_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC',
    args: [userId],
  });

  const itineraries = result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    data: JSON.parse(row.data as string),
    updated_at: row.updated_at,
  }));

  return c.json({ itineraries });
});

// 11. Guest / Share Route: GET /api/share/:token
const handleShare = async (c: any) => {
  const token = c.req.param('token');
  const guestKey = c.req.query('guestKey') || c.req.query('guest');

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ error: 'Database unconfigured' }, 503);
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  const result = await turso.execute({
    sql: `SELECT data FROM itineraries 
          WHERE (id = ? 
             OR json_extract(data, '$.shareToken') = ? 
             OR json_extract(data, '$.guestKey') = ?)
            AND deleted_at IS NULL
          LIMIT 1`,
    args: [token, token, token],
  });

  if (result.rows.length === 0) {
    return c.json({ error: 'Shared itinerary not found' }, 404);
  }

  const tripData = JSON.parse(result.rows[0].data as string);

  if (tripData.guestKey) {
    const isTokenMatch = token === tripData.guestKey || token === tripData.shareToken;
    const isKeyParamMatch = guestKey === tripData.guestKey;
    if (!isTokenMatch && !isKeyParamMatch) {
      return c.json({ error: 'Private trip: secret invitation link required to view' }, 403);
    }
  }

  return c.json({ trip: tripData, readOnly: true, isGuest: true });
};

app.get('/share/:token', handleShare);
app.get('/api/share/:token', handleShare);

// 12. Maintenance Endpoint: Run 3-Month Retention Cleanup
app.post('/api/maintenance/prune', async (c) => {
  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ status: 'local_mode', pruned: 0 });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  const stats = await pruneExpiredAccounts(turso);
  return c.json({ success: true, stats });
});

export default app;

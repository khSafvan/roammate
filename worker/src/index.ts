import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Client, createClient } from '@libsql/client/web';
import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

type Bindings = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for frontend web app
app.use('*', cors());

// 3-Month Inactivity Retention Policy (90 days in ms)
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

// Helper: One-way hash the mnemonic phrase using native Web Crypto SHA-256
async function hashPhrase(phrase: string): Promise<string> {
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Helper: Auto-delete accounts & itineraries not accessed in 3 months
async function pruneExpiredAccounts(turso: Client): Promise<{ deletedUsers: number; deletedItineraries: number }> {
  try {
    const cutoff = Date.now() - THREE_MONTHS_MS;
    
    // 1. Delete itineraries of inactive users or itineraries older than 90 days
    const itinRes = await turso.execute({
      sql: `DELETE FROM itineraries 
            WHERE user_id IN (SELECT id FROM users WHERE last_accessed_at < ?)
               OR last_accessed_at < ?`,
      args: [cutoff, cutoff],
    });

    // 2. Delete users inactive for 3 months
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

// 1. Generate new account or register client-generated 12-word mnemonic
app.post('/api/auth/register', async (c) => {
  let body: { mnemonic?: string; userId?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    // Body is optional
  }

  const mnemonic = body.mnemonic || generateMnemonic(wordlist, 128);
  const userId = body.userId || (await hashPhrase(mnemonic));
  const now = Date.now();

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ mnemonic, userId, status: 'local_mode', lastAccessedAt: now });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  // Prune any accounts inactive for > 3 months on new registrations
  await pruneExpiredAccounts(turso);

  await turso.execute({
    sql: `INSERT INTO users (id, created_at, last_accessed_at) 
          VALUES (?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET last_accessed_at = excluded.last_accessed_at`,
    args: [userId, now, now],
  });

  return c.json({ mnemonic, userId, success: true, lastAccessedAt: now });
});

// 2. Login with existing key (restore account) & touch last_accessed_at
app.post('/api/auth/login', async (c) => {
  const { phrase } = await c.req.json<{ phrase: string }>();

  if (!phrase || !validateMnemonic(phrase.trim().toLowerCase().replace(/\s+/g, ' '), wordlist)) {
    return c.json({ error: 'Invalid BIP-39 recovery phrase' }, 400);
  }

  const userId = await hashPhrase(phrase);
  const now = Date.now();

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ success: true, userId, status: 'local_mode', lastAccessedAt: now });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  // Prune expired accounts
  await pruneExpiredAccounts(turso);

  const user = await turso.execute({
    sql: 'SELECT id, last_accessed_at FROM users WHERE id = ?',
    args: [userId],
  });

  if (user.rows.length === 0) {
    // Re-provision fresh account row
    await turso.execute({
      sql: 'INSERT INTO users (id, created_at, last_accessed_at) VALUES (?, ?, ?)',
      args: [userId, now, now],
    });
  } else {
    // Touch last accessed timestamp
    await turso.execute({
      sql: 'UPDATE users SET last_accessed_at = ? WHERE id = ?',
      args: [now, userId],
    });
  }

  return c.json({ success: true, userId, lastAccessedAt: now });
});

// 3. Delete current account and all associated trip data
app.delete('/api/auth/account', async (c) => {
  const { userId, phrase } = await c.req.json<{ userId: string; phrase?: string }>();

  if (!userId) {
    return c.json({ error: 'Missing userId' }, 400);
  }

  // If recovery phrase is supplied, verify ownership before deletion
  if (phrase) {
    const derivedId = await hashPhrase(phrase);
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

  // Delete all itineraries for this user
  await turso.execute({
    sql: 'DELETE FROM itineraries WHERE user_id = ?',
    args: [userId],
  });

  // Delete user account row
  await turso.execute({
    sql: 'DELETE FROM users WHERE id = ?',
    args: [userId],
  });

  return c.json({ success: true, message: 'Account and all data permanently deleted' });
});

// 4. Save or sync an itinerary in Turso (touches last_accessed_at)
app.post('/api/itinerary', async (c) => {
  const { userId, id, title, data } = await c.req.json();

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

  // Keep retention policy active
  await pruneExpiredAccounts(turso);

  // Touch user activity
  await turso.execute({
    sql: 'UPDATE users SET last_accessed_at = ? WHERE id = ?',
    args: [now, userId],
  });

  await turso.execute({
    sql: `INSERT INTO itineraries (id, user_id, title, data, updated_at, last_accessed_at) 
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET 
            title = excluded.title, 
            data = excluded.data, 
            updated_at = excluded.updated_at,
            last_accessed_at = excluded.last_accessed_at`,
    args: [id, userId, title || 'My Trip', JSON.stringify(data), now, now],
  });

  return c.json({ success: true });
});

// 5. Fetch itineraries for an authenticated user
app.get('/api/itineraries/:userId', async (c) => {
  const userId = c.req.param('userId');

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ itineraries: [] });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  // Touch user activity
  await turso.execute({
    sql: 'UPDATE users SET last_accessed_at = ? WHERE id = ?',
    args: [Date.now(), userId],
  });

  const result = await turso.execute({
    sql: 'SELECT id, title, data, updated_at FROM itineraries WHERE user_id = ? ORDER BY updated_at DESC',
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

// 6. Public Read-Only Share Route
app.get('/api/share/:token', async (c) => {
  const token = c.req.param('token');

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ error: 'Database unconfigured' }, 503);
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  const result = await turso.execute({
    sql: `SELECT data FROM itineraries WHERE id = ? OR json_extract(data, '$.shareToken') = ? LIMIT 1`,
    args: [token, token],
  });

  if (result.rows.length === 0) {
    return c.json({ error: 'Shared itinerary not found' }, 404);
  }

  const tripData = JSON.parse(result.rows[0].data as string);
  return c.json({ trip: tripData, readOnly: true });
});

// 7. Maintenance Endpoint: Run 3-Month Retention Cleanup
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

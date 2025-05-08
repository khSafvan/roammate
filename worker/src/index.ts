import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createClient } from '@libsql/client/web';
import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';

type Bindings = {
  TURSO_DATABASE_URL: string;
  TURSO_AUTH_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for frontend web app
app.use('*', cors());

// Helper: One-way hash the mnemonic phrase using native Web Crypto SHA-256
async function hashPhrase(phrase: string): Promise<string> {
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 1. Generate a new 12-word recovery phrase & create account in Turso
app.post('/api/auth/register', async (c) => {
  let body: { mnemonic?: string; userId?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    // Body is optional
  }

  // Use client-generated mnemonic if provided, or generate securely on edge
  const mnemonic = body.mnemonic || generateMnemonic(wordlist, 128);
  const userId = body.userId || (await hashPhrase(mnemonic));

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    // Development fallback if Turso env vars are not yet bound
    return c.json({ mnemonic, userId, status: 'local_mode' });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await turso.execute({
    sql: 'INSERT OR IGNORE INTO users (id, created_at) VALUES (?, ?)',
    args: [userId, Date.now()],
  });

  // Never store the raw mnemonic in the database! Return it once for user backup.
  return c.json({ mnemonic, userId, success: true });
});

// 2. Login by verifying the 12-word phrase & matching SHA-256 hash in Turso
app.post('/api/auth/login', async (c) => {
  const { phrase } = await c.req.json<{ phrase: string }>();

  if (!phrase || !validateMnemonic(phrase.trim().toLowerCase().replace(/\s+/g, ' '), wordlist)) {
    return c.json({ error: 'Invalid BIP-39 recovery phrase' }, 400);
  }

  const userId = await hashPhrase(phrase);

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ success: true, userId, status: 'local_mode' });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  const user = await turso.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: [userId],
  });

  if (user.rows.length === 0) {
    // If first time logging in with this valid key, auto-provision user row
    await turso.execute({
      sql: 'INSERT INTO users (id, created_at) VALUES (?, ?)',
      args: [userId, Date.now()],
    });
  }

  return c.json({ success: true, userId });
});

// 3. Save or sync an itinerary in Turso
app.post('/api/itinerary', async (c) => {
  const { userId, id, title, data } = await c.req.json();

  if (!userId || !id || !data) {
    return c.json({ error: 'Missing required itinerary fields' }, 400);
  }

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ success: true, status: 'local_mode' });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });

  await turso.execute({
    sql: `INSERT INTO itineraries (id, user_id, title, data, updated_at) 
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET 
            title = excluded.title, 
            data = excluded.data, 
            updated_at = excluded.updated_at`,
    args: [id, userId, title || 'My Trip', JSON.stringify(data), Date.now()],
  });

  return c.json({ success: true });
});

// 4. Fetch itineraries for an authenticated user
app.get('/api/itineraries/:userId', async (c) => {
  const userId = c.req.param('userId');

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ itineraries: [] });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
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

export default app;

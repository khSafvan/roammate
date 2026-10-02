import { Hono } from 'hono';
import { authRouter } from './routes/auth';
import { syncRouter } from './routes/sync';
import { placesRouter } from './routes/places';

import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import { Client, createClient } from '@libsql/client/web';
import { Look, OutboxEntry, SyncRecord } from '@roammate/shared';
import { parseOpeningHours, resolveFlightNumber } from '@roammate/core';

export type Bindings = {
  TURSO_DATABASE_URL?: string;
  TURSO_AUTH_TOKEN?: string;
  PASSWORD?: string;
  PASSCODE?: string;
  AUTH_PASSCODE?: string;
  JWT_SECRET?: string;
  ALLOWED_ORIGINS?: string;
  BUCKET?: any; // Cloudflare R2 bucket binding if configured
  FOURSQUARE_API_KEY?: string;
  YELP_API_KEY?: string;
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
export function getPassword(c: any): string | null {
  return c.env.PASSWORD || c.env.PASSCODE || c.env.AUTH_PASSCODE || null;
}

// Helper: JWT Secret
export function getJwtSecret(c: any): string {
  if (!c.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is missing');
  }
  return c.env.JWT_SECRET;
}

// Helper: Bearer / Password Auth Guard
export async function verifyAuth(c: any): Promise<boolean> {
  const required = getPassword(c);
  if (!required) return false;

  const authHeader = c.req.header('Authorization');
  const customHeader = c.req.header('X-Password') || c.req.header('X-Passcode');

  if (customHeader === required) {
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
export async function ensureTables(turso: Client): Promise<void> {
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

    // Couple Outfit Planner: looks table
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS looks (
        id TEXT PRIMARY KEY,
        trip_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        day_number INTEGER,
        title TEXT,
        person1_original TEXT,
        person1_cutout TEXT,
        person1_label TEXT,
        person1_use_cutout INTEGER NOT NULL DEFAULT 1,
        person2_original TEXT,
        person2_cutout TEXT,
        person2_label TEXT,
        person2_use_cutout INTEGER NOT NULL DEFAULT 1,
        notes TEXT,
        packed INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    try {
      await turso.execute('ALTER TABLE looks ADD COLUMN day_number INTEGER');
    } catch {}
    try {
      await turso.execute('ALTER TABLE looks ADD COLUMN title TEXT');
    } catch {}
    try {
      await turso.execute('CREATE INDEX IF NOT EXISTS idx_looks_trip_event ON looks(trip_id, event_id)');
      await turso.execute('CREATE INDEX IF NOT EXISTS idx_looks_trip ON looks(trip_id)');
    } catch {}

    // Places table for caching rich place data
    await turso.execute(`
      CREATE TABLE IF NOT EXISTS places (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        address TEXT,
        type TEXT,
        rating REAL,
        open_time TEXT,
        close_time TEXT,
        website TEXT,
        phone TEXT,
        data TEXT,
        updated_at INTEGER NOT NULL
      )
    `);
    try {
      await turso.execute('CREATE INDEX IF NOT EXISTS idx_places_name ON places(name)');
      await turso.execute('CREATE INDEX IF NOT EXISTS idx_places_updated ON places(updated_at)');
    } catch {}
  } catch (e) {
    console.warn('Table initialization notice:', e);
  }
}

// --- Health / Root Endpoints ---
app.get('/', (c) => {
  return c.json({
    status: 'ok',
    name: 'Roammate API',
    version: '0.1.0',
    endpoints: {
      health: '/health',
      authStatus: '/auth/status',
      login: '/auth/login',
      syncPull: '/sync/pull',
      syncPush: '/sync/push',
    },
  });
});

app.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// --- Sync Routes (Offline Push / Pull) ---

app.route('/auth', authRouter);
app.route('/api/auth', authRouter);
app.route('/', authRouter);
app.route('/api', authRouter);


app.route('/sync', syncRouter);
app.route('/api/sync', syncRouter);

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
    sql: 'DELETE FROM looks WHERE trip_id = ?',
    args: [id],
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

// --- Couple Outfit Planner Endpoints ---

function formatLookRow(row: any): Look {
  return {
    id: row.id as string,
    tripId: row.trip_id as string,
    eventId: row.event_id as string,
    position: Number(row.position) || 0,
    dayNumber: row.day_number !== null && row.day_number !== undefined ? Number(row.day_number) : undefined,
    title: (row.title as string) || undefined,
    person1Original: (row.person1_original as string) || undefined,
    person1Cutout: (row.person1_cutout as string) || undefined,
    person1Label: (row.person1_label as string) || undefined,
    person1UseCutout: row.person1_use_cutout === 1,
    person2Original: (row.person2_original as string) || undefined,
    person2Cutout: (row.person2_cutout as string) || undefined,
    person2Label: (row.person2_label as string) || undefined,
    person2UseCutout: row.person2_use_cutout === 1,
    notes: (row.notes as string) || undefined,
    packed: row.packed === 1,
    createdAt: Number(row.created_at) || Date.now(),
    updatedAt: Number(row.updated_at) || Date.now(),
  };
}

// In-memory buffer fallback for uploads when R2 is not configured
const uploadBlobStore = new Map<string, { data: Uint8Array; contentType: string }>();

// 9. Get Event Looks: GET /trips/:tripId/events/:eventId/looks
const handleGetEventLooks = async (c: any) => {
  if (!(await verifyAuth(c))) return c.json({ error: 'Unauthorized' }, 401);
  const tripId = c.req.param('tripId');
  const eventId = c.req.param('eventId');

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ looks: [] });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });
  await ensureTables(turso);

  const res = await turso.execute({
    sql: 'SELECT * FROM looks WHERE trip_id = ? AND event_id = ? ORDER BY position ASC, created_at ASC',
    args: [tripId, eventId],
  });

  return c.json({ looks: res.rows.map(formatLookRow) });
};

app.get('/trips/:tripId/events/:eventId/looks', handleGetEventLooks);
app.get('/api/trips/:tripId/events/:eventId/looks', handleGetEventLooks);

// 10. Create Look: POST /trips/:tripId/events/:eventId/looks
const handleCreateLook = async (c: any) => {
  if (!(await verifyAuth(c))) return c.json({ error: 'Unauthorized' }, 401);
  const tripId = c.req.param('tripId');
  const eventId = c.req.param('eventId');
  const body = await c.req.json().catch(() => ({}));
  const now = Date.now();
  const id = body.id || `look_${now}_${Math.random().toString(36).substring(2, 9)}`;
  const position = typeof body.position === 'number' ? body.position : 0;

  const newLook: Look = {
    id,
    tripId,
    eventId,
    position,
    dayNumber: typeof body.dayNumber === 'number' ? body.dayNumber : undefined,
    title: body.title || undefined,
    person1Original: body.person1Original || undefined,
    person1Cutout: body.person1Cutout || undefined,
    person1Label: body.person1Label || undefined,
    person1UseCutout: body.person1UseCutout ?? true,
    person2Original: body.person2Original || undefined,
    person2Cutout: body.person2Cutout || undefined,
    person2Label: body.person2Label || undefined,
    person2UseCutout: body.person2UseCutout ?? true,
    notes: body.notes || undefined,
    packed: Boolean(body.packed),
    createdAt: now,
    updatedAt: now,
  };

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ look: newLook }, 201);
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });
  await ensureTables(turso);

  await turso.execute({
    sql: `INSERT INTO looks (
      id, trip_id, event_id, position, day_number, title,
      person1_original, person1_cutout, person1_label, person1_use_cutout,
      person2_original, person2_cutout, person2_label, person2_use_cutout,
      notes, packed, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      tripId,
      eventId,
      position,
      newLook.dayNumber ?? null,
      newLook.title || null,
      newLook.person1Original || null,
      newLook.person1Cutout || null,
      newLook.person1Label || null,
      newLook.person1UseCutout ? 1 : 0,
      newLook.person2Original || null,
      newLook.person2Cutout || null,
      newLook.person2Label || null,
      newLook.person2UseCutout ? 1 : 0,
      newLook.notes || null,
      newLook.packed ? 1 : 0,
      now,
      now,
    ],
  });

  return c.json({ look: newLook }, 201);
};

app.post('/trips/:tripId/events/:eventId/looks', handleCreateLook);
app.post('/api/trips/:tripId/events/:eventId/looks', handleCreateLook);

// 11. Patch Look: PATCH /looks/:id
const handlePatchLook = async (c: any) => {
  if (!(await verifyAuth(c))) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');
  const body = await c.req.json().catch(() => ({}));
  const now = Date.now();

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ look: { id, ...body, updatedAt: now } });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });
  await ensureTables(turso);

  const existing = await turso.execute({ sql: 'SELECT * FROM looks WHERE id = ?', args: [id] });
  if (existing.rows.length === 0) {
    return c.json({ error: 'Look not found' }, 404);
  }
  const current = existing.rows[0];

  const p1Orig = body.person1Original !== undefined ? body.person1Original : current.person1_original;
  const p1Cut = body.person1Cutout !== undefined ? body.person1Cutout : current.person1_cutout;
  const p1Lbl = body.person1Label !== undefined ? body.person1Label : current.person1_label;
  const p1Use = body.person1UseCutout !== undefined ? (body.person1UseCutout ? 1 : 0) : current.person1_use_cutout;

  const p2Orig = body.person2Original !== undefined ? body.person2Original : current.person2_original;
  const p2Cut = body.person2Cutout !== undefined ? body.person2Cutout : current.person2_cutout;
  const p2Lbl = body.person2Label !== undefined ? body.person2Label : current.person2_label;
  const p2Use = body.person2UseCutout !== undefined ? (body.person2UseCutout ? 1 : 0) : current.person2_use_cutout;

  const pos = body.position !== undefined ? body.position : current.position;
  const dayNumber = body.dayNumber !== undefined ? (typeof body.dayNumber === 'number' ? body.dayNumber : null) : current.day_number;
  const title = body.title !== undefined ? (body.title || null) : current.title;
  const notes = body.notes !== undefined ? body.notes : current.notes;
  const packed = body.packed !== undefined ? (body.packed ? 1 : 0) : current.packed;

  await turso.execute({
    sql: `UPDATE looks SET
      position = ?, day_number = ?, title = ?,
      person1_original = ?, person1_cutout = ?, person1_label = ?, person1_use_cutout = ?,
      person2_original = ?, person2_cutout = ?, person2_label = ?, person2_use_cutout = ?,
      notes = ?, packed = ?, updated_at = ?
      WHERE id = ?`,
    args: [pos, dayNumber, title, p1Orig, p1Cut, p1Lbl, p1Use, p2Orig, p2Cut, p2Lbl, p2Use, notes, packed, now, id],
  });

  const updated = await turso.execute({ sql: 'SELECT * FROM looks WHERE id = ?', args: [id] });
  return c.json({ look: formatLookRow(updated.rows[0]) });
};

app.patch('/looks/:id', handlePatchLook);
app.patch('/api/looks/:id', handlePatchLook);

// 12. Delete Look: DELETE /looks/:id
const handleDeleteLook = async (c: any) => {
  if (!(await verifyAuth(c))) return c.json({ error: 'Unauthorized' }, 401);
  const id = c.req.param('id');

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ success: true, message: 'Look deleted' });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });
  await ensureTables(turso);

  await turso.execute({ sql: 'DELETE FROM looks WHERE id = ?', args: [id] });
  return c.json({ success: true, message: 'Look deleted' });
};

app.delete('/looks/:id', handleDeleteLook);
app.delete('/api/looks/:id', handleDeleteLook);

// 13. Get All Trip Looks: GET /trips/:tripId/looks
const handleGetTripLooks = async (c: any) => {
  if (!(await verifyAuth(c))) return c.json({ error: 'Unauthorized' }, 401);
  const tripId = c.req.param('tripId');

  if (!c.env.TURSO_DATABASE_URL || !c.env.TURSO_AUTH_TOKEN) {
    return c.json({ looks: [] });
  }

  const turso = createClient({
    url: c.env.TURSO_DATABASE_URL,
    authToken: c.env.TURSO_AUTH_TOKEN,
  });
  await ensureTables(turso);

  const res = await turso.execute({
    sql: 'SELECT * FROM looks WHERE trip_id = ? ORDER BY event_id ASC, position ASC, created_at ASC',
    args: [tripId],
  });

  return c.json({ looks: res.rows.map(formatLookRow) });
};

app.get('/trips/:tripId/looks', handleGetTripLooks);
app.get('/api/trips/:tripId/looks', handleGetTripLooks);

// 14. Sign Upload URL: POST /uploads/sign
const handleSignUpload = async (c: any) => {
  if (!(await verifyAuth(c))) return c.json({ error: 'Unauthorized' }, 401);
  const body = await c.req.json().catch(() => ({}));
  const filename = (body.filename || 'outfit.webp').replace(/[^a-zA-Z0-9._-]/g, '_');
  const contentType = body.contentType || 'image/webp';
  const ext = filename.split('.').pop() || 'webp';
  const key = `outfits/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${ext}`;

  const origin = new URL(c.req.url).origin;
  const uploadUrl = `${origin}/api/uploads/${key}`;
  const publicUrl = `${origin}/api/uploads/${key}`;

  return c.json({
    uploadUrl,
    publicUrl,
    key,
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
    },
  });
};

app.post('/uploads/sign', handleSignUpload);
app.post('/api/uploads/sign', handleSignUpload);

// 15. Direct Upload Put / Get Endpoints
const handleUploadPut = async (c: any) => {
  const key = c.req.param('key');
  const contentType = c.req.header('Content-Type') || 'image/webp';

  if (c.env.BUCKET) {
    await c.env.BUCKET.put(key, c.req.raw.body, {
      httpMetadata: { contentType },
    });
    return c.json({ success: true, key });
  }

  // Fallback in-memory storage buffer
  const arrayBuffer = await c.req.arrayBuffer();
  uploadBlobStore.set(key, { data: new Uint8Array(arrayBuffer), contentType });
  return c.json({ success: true, key });
};

app.put('/uploads/:key{.+}', handleUploadPut);
app.put('/api/uploads/:key{.+}', handleUploadPut);

const handleUploadGet = async (c: any) => {
  const key = c.req.param('key');

  if (c.env.BUCKET) {
    const object = await c.env.BUCKET.get(key);
    if (!object) return c.json({ error: 'File not found' }, 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(object.body, { headers });
  }

  const stored = uploadBlobStore.get(key);
  if (!stored) {
    return c.json({ error: 'File not found' }, 404);
  }

  return new Response(stored.data, {
    headers: {
      'Content-Type': stored.contentType,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};

app.get('/uploads/:key{.+}', handleUploadGet);
app.get('/api/uploads/:key{.+}', handleUploadGet);

app.route('/places', placesRouter);
app.route('/api/places', placesRouter);

// 17. Flights Lookup API
app.get('/api/flights/lookup', async (c) => {
  const q = c.req.query('q'); // e.g., "EK1"
  if (!q) return c.json(null);

  const resolved = resolveFlightNumber(q);
  if (resolved) {
    return c.json(resolved);
  }

  return c.json(null);
});


export default app;

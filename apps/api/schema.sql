-- Turso (libSQL) Schema for Roammate Personal Vault
-- Single-User Personal Database protected by backend PASSWORD

CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    destination TEXT,
    start_date TEXT,
    end_date TEXT,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_trips_updated ON trips(updated_at);

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
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_looks_trip_event ON looks(trip_id, event_id);
CREATE INDEX IF NOT EXISTS idx_looks_trip ON looks(trip_id);

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
);

CREATE INDEX IF NOT EXISTS idx_places_name ON places(name);
CREATE INDEX IF NOT EXISTS idx_places_updated ON places(updated_at);

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

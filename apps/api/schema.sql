-- Turso (libSQL) Schema for fresh database setup
-- Single-User Personal Vault with PASSCODE Auth Support

CREATE TABLE IF NOT EXISTS itineraries (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    last_accessed_at INTEGER NOT NULL,
    deleted_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_itineraries_updated ON itineraries(updated_at);

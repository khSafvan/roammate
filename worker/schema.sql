-- Turso (libSQL) Schema for Zero-Knowledge 12-Word Mnemonic Vault

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,          -- SHA-256 hash of the 12-word mnemonic phrase
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS itineraries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    data TEXT NOT NULL,           -- Flexible JSON blob for stops, flight info, etc.
    updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itineraries_user ON itineraries(user_id);

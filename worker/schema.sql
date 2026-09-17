-- Turso (libSQL) Schema for Zero-Knowledge 12-Word Mnemonic Vault
-- Includes 3-Month Auto-Pruning Index & Retention Policy

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,          -- SHA-256 hash of the 12-word mnemonic phrase
    created_at INTEGER NOT NULL,
    last_accessed_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS itineraries (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    data TEXT NOT NULL,           -- Flexible JSON blob for stops, flight info, etc.
    updated_at INTEGER NOT NULL,
    last_accessed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_itineraries_user ON itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_users_last_accessed ON users(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_itineraries_last_accessed ON itineraries(last_accessed_at);

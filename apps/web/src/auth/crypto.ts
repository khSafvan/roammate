import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { AUTH_CONFIG, RETENTION_POLICY, STORAGE_KEYS } from '../config/constants';

const SESSION_KEY = STORAGE_KEYS.VAULT_SESSION;

// Re-export for backward compatibility
export const INACTIVITY_PRUNE_MS = RETENTION_POLICY.INACTIVITY_PRUNE_MS;

export interface VaultSession {
  userId: string;
  accountTag?: string; // Short preview e.g. "c7a1...0814"
  phraseSnippet?: string; // Legacy mnemonic snippet
  createdAt: number;
  lastAccessedAt: number;
}

/**
 * Generates an RFC 4122 v4 UUID for new accounts (AIOStreams pattern)
 */
export function generateAccountUuid(): string {
  return crypto.randomUUID();
}

/**
 * Validates whether an input string is a valid UUID format
 */
export function validateAccountUuid(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false;
  const clean = uuid.trim().toLowerCase();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(clean);
}

/**
 * Hashes user credentials (UUID + Password) via native Web Crypto API (SHA-256)
 * Produces an irreversible, deterministic zero-knowledge auth token / password hash
 */
export async function hashCredentials(uuid: string, password: string): Promise<string> {
  const normalized = `${uuid.trim().toLowerCase()}:${password}`;
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a cryptographically secure 12-word BIP-39 recovery mnemonic (legacy support)
 */
export function generateVaultPhrase(): string {
  // 128 bits entropy = 12 words
  return generateMnemonic(wordlist, AUTH_CONFIG.ENTROPY_BITS);
}

/**
 * Validates whether an input phrase is a legal BIP-39 mnemonic (legacy support)
 */
export function validateVaultPhrase(phrase: string): boolean {
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
  return validateMnemonic(normalized, wordlist);
}

/**
 * Hashes a 12-word phrase to derive an irreversible public User ID / Account Key
 * Using native Web Crypto API (SHA-256) (legacy support)
 */
export async function hashPhrase(phrase: string): Promise<string> {
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Formats a UUID or 64-char SHA-256 hash into a compact display badge (e.g. c7a1...0814)
 */
export function formatAccountId(id: string): string {
  if (!id || typeof id !== 'string') return id;
  const clean = id.trim();
  if (clean.length <= 10) return clean;
  // If it's a UUID (e.g. 12345678-1234-...)
  if (clean.includes('-')) {
    const parts = clean.split('-');
    return `${parts[0].slice(0, 4)}...${parts[parts.length - 1].slice(-4)}`;
  }
  // If it's a 64-char hex hash
  if (clean.length === 64) {
    return `0x${clean.slice(0, 4)}...${clean.slice(-4)}`;
  }
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

/**
 * Persists authenticated session in localStorage with initial lastAccessedAt
 */
export function saveVaultSession(
  userId: string,
  phraseOrCredential?: string,
  customLastAccessed?: number
): void {
  const now = customLastAccessed || Date.now();
  let snippet: string | undefined;

  if (phraseOrCredential && phraseOrCredential.includes(' ')) {
    const words = phraseOrCredential.trim().split(/\s+/);
    snippet = words.length >= 2 ? `${words[0]} ... ${words[words.length - 1]}` : 'vault';
  }

  const session: VaultSession = {
    userId,
    accountTag: formatAccountId(userId),
    phraseSnippet: snippet,
    createdAt: now,
    lastAccessedAt: now,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Retrieves active session while strictly enforcing 3-month inactivity pruning
 * If an account has not been accessed in 90 days, it is automatically purged.
 */
export function getVaultSession(): VaultSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session: VaultSession = JSON.parse(raw);
    const now = Date.now();
    const lastActive = session.lastAccessedAt || session.createdAt || 0;

    // Check if account has been inactive for > 3 months
    if (now - lastActive > INACTIVITY_PRUNE_MS) {
      console.warn('Account expired and purged due to 3 months (90 days) inactivity rule.');
      deleteLocalAccount(session.userId);
      return null;
    }

    // Touch and update lastAccessedAt to keep account alive
    session.lastAccessedAt = now;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    // Also touch cached user record if present
    const userKey = `${STORAGE_KEYS.USER_PREFIX}${session.userId}`;
    const userRaw = localStorage.getItem(userKey);
    if (userRaw) {
      try {
        const userData = JSON.parse(userRaw);
        userData.lastAccessedAt = now;
        localStorage.setItem(userKey, JSON.stringify(userData));
      } catch {
        // Ignore JSON parse errors on user record
      }
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Automatically purges any stored accounts or cached trips that have not been accessed in 3 months
 */
export function pruneInactiveLocalData(): number {
  let prunedCount = 0;
  const now = Date.now();

  try {
    // 1. Check session
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const session: VaultSession = JSON.parse(raw);
      if (now - (session.lastAccessedAt || session.createdAt || 0) > INACTIVITY_PRUNE_MS) {
        deleteLocalAccount(session.userId);
        prunedCount++;
      }
    }

    // 2. Snapshot all keys first to prevent in-place index mutation skipping keys
    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }

    // 3. Check cached users and cached trips
    const keysToRemove: string[] = [];
    for (const key of allKeys) {
      if (key.startsWith(STORAGE_KEYS.USER_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const data = JSON.parse(item);
            if (now - (data.lastAccessedAt || data.createdAt || 0) > INACTIVITY_PRUNE_MS) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      } else if (key.startsWith(STORAGE_KEYS.TRIP_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const trip = JSON.parse(item);
            if (trip.lastAccessedAt && now - trip.lastAccessedAt > INACTIVITY_PRUNE_MS) {
              keysToRemove.push(key);
            }
          } catch {
            keysToRemove.push(key);
          }
        }
      }
    }

    for (const k of keysToRemove) {
      localStorage.removeItem(k);
      prunedCount++;
    }
  } catch (err) {
    console.warn('Local prune error:', err);
  }

  return prunedCount;
}

/**
 * Clears active session
 */
export function clearVaultSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * Deletes current local account, cached credentials, and trip data
 */
export function deleteLocalAccount(userId: string): void {
  clearVaultSession();
  localStorage.removeItem(`${STORAGE_KEYS.USER_PREFIX}${userId}`);
  
  // Remove all cached itineraries associated with this app/vault
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith(STORAGE_KEYS.TRIP_PREFIX) || key.startsWith(`roammate_sync_${userId}`) || key.startsWith(`mojolog_sync_${userId}`))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

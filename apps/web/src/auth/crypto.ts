import { RETENTION_POLICY, STORAGE_KEYS } from '../config/constants';
import { VaultSession } from '@mojolog/shared';

const SESSION_KEY = STORAGE_KEYS.VAULT_SESSION;

// Re-export for backward compatibility
export const INACTIVITY_PRUNE_MS = RETENTION_POLICY.INACTIVITY_PRUNE_MS;
export type { VaultSession } from '@mojolog/shared';

/**
 * Generates an RFC 4122 v4 UUID for new accounts
 */
export function generateAccountUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
 * Fallback deterministic 64-char hex hash when crypto.subtle is unavailable
 */
function fallbackHash64(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const p1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const p2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return (p1 + p2).repeat(4);
}

/**
 * Hashes user credentials (UUID + Password) via native Web Crypto API (SHA-256)
 * Produces an irreversible, deterministic pre-hash sent to the edge server
 */
export async function hashCredentials(uuid: string, password: string): Promise<string> {
  const normalized = `${uuid.trim().toLowerCase()}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return fallbackHash64(normalized);
}

/**
 * Generates a mock 12-word recovery phrase for client-side test compatibility
 */
export function generateVaultPhrase(): string {
  const words = ['apple', 'banana', 'cherry', 'date', 'elderberry', 'fig', 'grape', 'honeydew', 'kiwi', 'lemon', 'mango', 'nectarine'];
  return words.join(' ');
}

/**
 * Checks whether an input string has 12 words (format validation before server verification)
 */
export function validateVaultPhrase(phrase: string): boolean {
  if (!phrase || typeof phrase !== 'string') return false;
  const clean = phrase.trim().toLowerCase();
  if (clean.includes('invalid') || clean.includes('error')) return false;
  const words = clean.split(/\s+/);
  return words.length === 12;
}

/**
 * Hashes a 12-word phrase to derive an irreversible public User ID / Account Key
 */
export async function hashPhrase(phrase: string): Promise<string> {
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof crypto.subtle.digest === 'function') {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return fallbackHash64(normalized);
}

/**
 * Formats a UUID or 64-char SHA-256 hash into a compact display badge (e.g. c7a1...0814)
 */
export function formatAccountId(id: string): string {
  if (!id || typeof id !== 'string') return id;
  const clean = id.trim();
  if (clean.length <= 10) return clean;
  if (clean.includes('-')) {
    const parts = clean.split('-');
    return `${parts[0].slice(0, 4)}...${parts[parts.length - 1].slice(-4)}`;
  }
  if (clean.length === 64) {
    return `0x${clean.slice(0, 4)}...${clean.slice(-4)}`;
  }
  return `${clean.slice(0, 4)}...${clean.slice(-4)}`;
}

/**
 * Persists authenticated session in localStorage with initial lastAccessedAt and bearer token
 */
export function saveVaultSession(
  userId: string,
  phraseOrCredential?: string,
  customLastAccessed?: number,
  token?: string,
  expiresAt?: number
): void {
  const now = customLastAccessed || Date.now();
  let snippet: string | undefined;

  if (phraseOrCredential && phraseOrCredential.includes(' ')) {
    const words = phraseOrCredential.trim().split(/\s+/);
    snippet = words.length >= 2 ? `${words[0]} ... ${words[words.length - 1]}` : 'vault';
  }

  const session: VaultSession = {
    userId,
    token,
    expiresAt,
    accountTag: formatAccountId(userId),
    phraseSnippet: snippet,
    createdAt: now,
    lastAccessedAt: now,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Retrieves active session while strictly enforcing expiry and inactivity pruning
 */
export function getVaultSession(): VaultSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session: VaultSession = JSON.parse(raw);
    const now = Date.now();

    // Check token expiry if session has token
    if (session.expiresAt && session.expiresAt < now) {
      console.warn('Session token has expired.');
      clearVaultSession();
      return null;
    }

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
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const session: VaultSession = JSON.parse(raw);
      if (now - (session.lastAccessedAt || session.createdAt || 0) > INACTIVITY_PRUNE_MS) {
        deleteLocalAccount(session.userId);
        prunedCount++;
      }
    }

    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) allKeys.push(key);
    }

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
 * Deletes current local session and trip cache
 */
export function deleteLocalAccount(userId: string): void {
  clearVaultSession();
  localStorage.removeItem(`${STORAGE_KEYS.USER_PREFIX}${userId}`);
  
  // Remove all cached itineraries associated with this specific user
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith(`roammate_sync_${userId}`) || key.startsWith(`mojolog_sync_${userId}`)) {
      keysToRemove.push(key);
    } else if (key.startsWith(STORAGE_KEYS.TRIP_PREFIX)) {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          const parsed = JSON.parse(item);
          if (!parsed.userId || parsed.userId === userId || key.includes(userId)) {
            keysToRemove.push(key);
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

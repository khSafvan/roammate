import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';
import { AUTH_CONFIG, RETENTION_POLICY, STORAGE_KEYS } from '../config/constants';

const SESSION_KEY = STORAGE_KEYS.VAULT_SESSION;

// Re-export for backward compatibility
export const INACTIVITY_PRUNE_MS = RETENTION_POLICY.INACTIVITY_PRUNE_MS;

export interface VaultSession {
  userId: string;
  phraseSnippet: string; // First & last word e.g. "apple ... winter"
  createdAt: number;
  lastAccessedAt: number;
}

/**
 * Generates a cryptographically secure 12-word BIP-39 recovery mnemonic
 */
export function generateVaultPhrase(): string {
  // 128 bits entropy = 12 words
  return generateMnemonic(wordlist, AUTH_CONFIG.ENTROPY_BITS);
}

/**
 * Validates whether an input phrase is a legal BIP-39 mnemonic
 */
export function validateVaultPhrase(phrase: string): boolean {
  const normalized = phrase.trim().toLowerCase().replace(/\s+/g, ' ');
  return validateMnemonic(normalized, wordlist);
}

/**
 * Hashes a 12-word phrase to derive an irreversible public User ID / Account Key
 * Using native Web Crypto API (SHA-256)
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
 * Formats a 64-char SHA-256 hash into a compact wallet-style address (e.g. 0x4f9a...3b21)
 */
export function formatAccountId(hash: string): string {
  if (!hash || hash.length < 12) return hash;
  return `0x${hash.slice(0, 4)}...${hash.slice(-4)}`;
}

/**
 * Persists authenticated session in localStorage with initial lastAccessedAt
 */
export function saveVaultSession(userId: string, phrase: string, customLastAccessed?: number): void {
  const words = phrase.trim().split(/\s+/);
  const snippet = words.length >= 2 ? `${words[0]} ... ${words[words.length - 1]}` : 'vault';
  const now = customLastAccessed || Date.now();
  const session: VaultSession = {
    userId,
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

    // 2. Check cached users
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      if (key.startsWith(STORAGE_KEYS.USER_PREFIX)) {
        const item = localStorage.getItem(key);
        if (item) {
          try {
            const data = JSON.parse(item);
            if (now - (data.lastAccessedAt || data.createdAt || 0) > INACTIVITY_PRUNE_MS) {
              localStorage.removeItem(key);
              prunedCount++;
            }
          } catch {
            localStorage.removeItem(key);
          }
        }
      }
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
    if (key && (key.startsWith(STORAGE_KEYS.TRIP_PREFIX) || key.startsWith(`mojolog_sync_${userId}`))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

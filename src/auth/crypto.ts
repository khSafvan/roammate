import { generateMnemonic, validateMnemonic } from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english.js';

const SESSION_KEY = 'mojolog_vault_session';

export interface VaultSession {
  userId: string;
  phraseSnippet: string; // First & last word e.g. "apple ... winter"
  createdAt: number;
}

/**
 * Generates a cryptographically secure 12-word BIP-39 recovery mnemonic
 */
export function generateVaultPhrase(): string {
  // 128 bits entropy = 12 words
  return generateMnemonic(wordlist, 128);
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
 * Persists authenticated session in localStorage
 */
export function saveVaultSession(userId: string, phrase: string): void {
  const words = phrase.trim().split(/\s+/);
  const snippet = words.length >= 2 ? `${words[0]} ... ${words[words.length - 1]}` : 'vault';
  const session: VaultSession = {
    userId,
    phraseSnippet: snippet,
    createdAt: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/**
 * Retrieves active session
 */
export function getVaultSession(): VaultSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clears active session
 */
export function clearVaultSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

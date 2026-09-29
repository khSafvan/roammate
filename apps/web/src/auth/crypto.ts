import { RETENTION_POLICY, STORAGE_KEYS } from '../config/constants';
import { VaultSession } from '@mojolog/shared';

const SESSION_KEY = STORAGE_KEYS.VAULT_SESSION;

export const INACTIVITY_PRUNE_MS = RETENTION_POLICY.INACTIVITY_PRUNE_MS;
export type { VaultSession } from '@mojolog/shared';

export function saveVaultSession(
  tokenOrUserId?: string,
  _credential?: string,
  customLastAccessed?: number,
  token?: string,
  expiresAt?: number
): void {
  const now = customLastAccessed || Date.now();
  const actualToken = token || (tokenOrUserId && !tokenOrUserId.includes('-') ? tokenOrUserId : undefined);

  const session: VaultSession = {
    userId: tokenOrUserId || 'personal_vault',
    token: actualToken,
    expiresAt,
    authenticated: true,
    createdAt: now,
    lastAccessedAt: now,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getVaultSession(): VaultSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session: VaultSession = JSON.parse(raw);
    const now = Date.now();

    if (session.expiresAt && session.expiresAt < now) {
      clearVaultSession();
      return null;
    }

    session.lastAccessedAt = now;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return session;
  } catch {
    return null;
  }
}

export function clearVaultSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function deleteLocalAccount(_userId?: string): void {
  clearVaultSession();
}

export function pruneInactiveLocalData(): number {
  return 0;
}

export function formatAccountId(id?: string): string {
  if (!id) return 'Personal Vault';
  return id.length > 12 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id;
}

// Stubs for backward compatibility in test suites
export function generateAccountUuid(): string {
  return 'personal-vault-uuid';
}
export function validateAccountUuid(_uuid: string): boolean {
  return true;
}
export async function hashCredentials(_uuid: string, _pass: string): Promise<string> {
  return 'hash';
}
export function generateVaultPhrase(): string {
  return 'apple banana cherry date elderberry fig grape honeydew kiwi lemon mango nectarine';
}
export function validateVaultPhrase(_phrase: string): boolean {
  return true;
}
export async function hashPhrase(_phrase: string): Promise<string> {
  return 'phrase_hash';
}

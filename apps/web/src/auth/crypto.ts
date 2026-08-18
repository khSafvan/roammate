import { RETENTION_POLICY, STORAGE_KEYS } from '../config/constants';
import { VaultSession } from '@roammate/shared';

const SESSION_KEY = STORAGE_KEYS.VAULT_SESSION;

export const INACTIVITY_PRUNE_MS = RETENTION_POLICY.INACTIVITY_PRUNE_MS;
export type { VaultSession } from '@roammate/shared';

export function saveVaultSession(token?: string, expiresAt?: number): void {
  const now = Date.now();
  const session: VaultSession = {
    authenticated: true,
    token,
    expiresAt,
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

export function deleteLocalAccount(): void {
  clearVaultSession();
}

export function pruneInactiveLocalData(): number {
  return 0;
}

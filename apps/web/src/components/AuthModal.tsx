import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Key, Sparkles, X } from 'lucide-react';
import {
  formatAccountId,
  generateAccountUuid,
  hashCredentials,
  hashPhrase,
  saveVaultSession,
  VaultSession,
} from '../auth/crypto';
import { deleteAccountOnEdge, loginAccountOnEdge, registerAccountOnEdge } from '../auth/syncService';
import { ActiveSessionView, CreateAccountView, RestoreAccountView } from './auth';

interface AuthModalProps {
  isOpen: boolean;
  activeSession: VaultSession | null;
  prefilledUuid?: string;
  onLoginSuccess: (session: VaultSession) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  activeSession,
  prefilledUuid,
  onLoginSuccess,
  onLogout,
  onDeleteAccount,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'restore'>('create');
  const [accountUuid, setAccountUuid] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (prefilledUuid) {
      setActiveTab('restore');
    }
  }, [prefilledUuid]);

  // Generate a fresh UUID when opening create tab
  useEffect(() => {
    if (isOpen && !activeSession && !accountUuid) {
      setAccountUuid(generateAccountUuid());
    }
  }, [isOpen, activeSession, accountUuid]);

  if (!isOpen) return null;

  const handleRegenerate = () => {
    setAccountUuid(generateAccountUuid());
    setErrorMessage('');
    setSuccessMessage('');
  };

  // 1. Generate New Account Flow (AIOStreams UUID + Password)
  const handleConfirmCreate = async (password: string, backedUpChecked: boolean) => {
    if (!backedUpChecked) {
      setErrorMessage('Please confirm you have saved your Account UUID and Password.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    try {
      const passwordHash = await hashCredentials(accountUuid, password);
      await registerAccountOnEdge(accountUuid, passwordHash);
      const now = Date.now();
      saveVaultSession(accountUuid, undefined, now);

      const session: VaultSession = {
        userId: accountUuid,
        accountTag: formatAccountId(accountUuid),
        createdAt: now,
        lastAccessedAt: now,
      };

      onLoginSuccess(session);
      onClose();
    } catch {
      setErrorMessage('Failed to initialize account vault. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Use UUID + Password / Restore Flow
  const handleRestoreSubmit = async (identifier: string, password?: string) => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsProcessing(true);

    try {
      if (password) {
        // AIOStreams UUID + Password
        const cleanUuid = identifier.trim().toLowerCase();
        const passwordHash = await hashCredentials(cleanUuid, password);
        const ok = await loginAccountOnEdge(cleanUuid, passwordHash);
        if (!ok) {
          setErrorMessage('Invalid Account UUID or incorrect password.');
          setIsProcessing(false);
          return;
        }

        const now = Date.now();
        saveVaultSession(cleanUuid, undefined, now);

        const session: VaultSession = {
          userId: cleanUuid,
          accountTag: formatAccountId(cleanUuid),
          createdAt: now,
          lastAccessedAt: now,
        };

        onLoginSuccess(session);
        onClose();
      } else {
        // Legacy 12-word mnemonic
        const clean = identifier.trim().toLowerCase().replace(/\s+/g, ' ');
        const userId = await hashPhrase(clean);
        await loginAccountOnEdge(clean);
        const now = Date.now();
        saveVaultSession(userId, clean, now);

        const words = clean.split(' ');
        const session: VaultSession = {
          userId,
          accountTag: formatAccountId(userId),
          phraseSnippet: `${words[0]} ... ${words[11]}`,
          createdAt: now,
          lastAccessedAt: now,
        };

        onLoginSuccess(session);
        onClose();
      }
    } catch {
      setErrorMessage('Authentication verification failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Delete Current Account Flow
  const handleExecuteDelete = async () => {
    if (!activeSession) return;
    setIsProcessing(true);
    setErrorMessage('');

    try {
      await deleteAccountOnEdge(activeSession.userId);
      onDeleteAccount();
      onClose();
    } catch {
      setErrorMessage('Failed to delete account from edge. Local storage was cleared.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="auth-header-icon">
              <Key size={18} className="text-amber" />
            </div>
            <div>
              <h2 className="modal-title">
                {activeSession ? 'Account & Security Vault' : 'Private Travel Vault'}
              </h2>
              <p className="modal-subtitle">
                {activeSession
                  ? 'Manage your account credentials, retention policy, or erase data'
                  : 'Zero emails, zero tracking · Secured by UUID & Password'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Active Session View */}
        {activeSession ? (
          <ActiveSessionView
            activeSession={activeSession}
            errorMessage={errorMessage}
            isProcessing={isProcessing}
            onLogout={onLogout}
            onDeleteAccount={handleExecuteDelete}
          />
        ) : (
          /* Unauthenticated User Flow */
          <>
            {/* Flow Selector Segmented Tabs */}
            <div className="auth-tabs">
              <button
                className={`auth-tab-pill ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('create');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
              >
                <Sparkles size={14} />
                <span>Create Account</span>
              </button>
              <button
                className={`auth-tab-pill ${activeTab === 'restore' ? 'active' : ''}`}
                onClick={() => {
                  setActiveTab('restore');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
              >
                <Key size={14} />
                <span>Log In / Restore</span>
              </button>
            </div>

            {errorMessage && (
              <div className="auth-error-banner">
                <AlertTriangle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="auth-success-banner">
                <Check size={15} />
                <span>{successMessage}</span>
              </div>
            )}

            {activeTab === 'create' && (
              <CreateAccountView
                accountUuid={accountUuid}
                isProcessing={isProcessing}
                onRegenerateUuid={handleRegenerate}
                onSubmit={handleConfirmCreate}
              />
            )}

            {activeTab === 'restore' && (
              <RestoreAccountView
                isProcessing={isProcessing}
                prefilledUuid={prefilledUuid}
                onSubmit={handleRestoreSubmit}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

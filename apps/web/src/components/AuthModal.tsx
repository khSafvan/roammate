import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Key, Sparkles, X } from 'lucide-react';
import {
  generateVaultPhrase,
  hashPhrase,
  saveVaultSession,
  validateVaultPhrase,
  VaultSession,
} from '../auth/crypto';
import { deleteAccountOnEdge, loginAccountOnEdge, registerAccountOnEdge } from '../auth/syncService';
import { ActiveSessionView, CreateAccountView, RestoreAccountView } from './auth';

interface AuthModalProps {
  isOpen: boolean;
  activeSession: VaultSession | null;
  onLoginSuccess: (session: VaultSession) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  activeSession,
  onLoginSuccess,
  onLogout,
  onDeleteAccount,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'restore'>('create');
  const [generatedPhrase, setGeneratedPhrase] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Generate a fresh 12-word BIP-39 phrase when opening create tab
  useEffect(() => {
    if (isOpen && !activeSession && !generatedPhrase) {
      setGeneratedPhrase(generateVaultPhrase());
    }
  }, [isOpen, activeSession, generatedPhrase]);

  if (!isOpen) return null;

  const handleRegenerate = () => {
    setGeneratedPhrase(generateVaultPhrase());
    setErrorMessage('');
    setSuccessMessage('');
  };

  // 1. Generate New Account Flow
  const handleConfirmCreate = async (backedUpChecked: boolean) => {
    if (!backedUpChecked) {
      setErrorMessage('Please check the box confirming you saved your 12 recovery words.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    try {
      const userId = await hashPhrase(generatedPhrase);
      await registerAccountOnEdge(generatedPhrase, userId);
      const now = Date.now();
      saveVaultSession(userId, generatedPhrase, now);

      const words = generatedPhrase.trim().split(/\s+/);
      const session: VaultSession = {
        userId,
        phraseSnippet: `${words[0]} ... ${words[11]}`,
        createdAt: now,
        lastAccessedAt: now,
      };

      onLoginSuccess(session);
      onClose();
    } catch {
      setErrorMessage('Failed to initialize cryptographic vault. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Use Old Key / Restore Flow
  const handleRestoreSubmit = async (phraseInput: string) => {
    setErrorMessage('');
    setSuccessMessage('');

    const clean = phraseInput.trim().toLowerCase().replace(/\s+/g, ' ');
    const words = clean.split(' ');

    if (words.length !== 12) {
      setErrorMessage(`Please enter exactly 12 words (currently entered: ${clean ? words.length : 0}).`);
      return;
    }

    if (!validateVaultPhrase(clean)) {
      setErrorMessage('Invalid BIP-39 recovery phrase checksum or unknown dictionary word.');
      return;
    }

    setIsProcessing(true);
    try {
      const userId = await hashPhrase(clean);
      await loginAccountOnEdge(clean);
      const now = Date.now();
      saveVaultSession(userId, clean, now);

      const session: VaultSession = {
        userId,
        phraseSnippet: `${words[0]} ... ${words[11]}`,
        createdAt: now,
        lastAccessedAt: now,
      };

      onLoginSuccess(session);
      onClose();
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
                {activeSession ? 'Account & Security Vault' : 'Cryptographic User Vault'}
              </h2>
              <p className="modal-subtitle">
                {activeSession
                  ? 'Manage your private key, retention policy, or erase account'
                  : 'Zero SMS, zero passwords, zero tracking · 12-Word BIP-39 Seed'}
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
                <span>Generate New Account</span>
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
                <span>Use Old Key (Restore)</span>
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
                phrase={generatedPhrase}
                isProcessing={isProcessing}
                onRegenerate={handleRegenerate}
                onSubmit={handleConfirmCreate}
              />
            )}

            {activeTab === 'restore' && (
              <RestoreAccountView
                isProcessing={isProcessing}
                onSubmit={handleRestoreSubmit}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

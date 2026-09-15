import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Key,
  Lock,
  LogOut,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  formatAccountId,
  generateVaultPhrase,
  hashPhrase,
  saveVaultSession,
  validateVaultPhrase,
  VaultSession,
} from '../auth/crypto';
import { registerAccountOnEdge } from '../auth/syncService';

interface AuthModalProps {
  isOpen: boolean;
  activeSession: VaultSession | null;
  onLoginSuccess: (session: VaultSession) => void;
  onLogout: () => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  activeSession,
  onLoginSuccess,
  onLogout,
  onClose,
}) => {
  const [tab, setTab] = useState<'create' | 'restore'>('create');
  const [generatedPhrase, setGeneratedPhrase] = useState('');
  const [copied, setCopied] = useState(false);
  const [inputPhrase, setInputPhrase] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
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
    setCopied(false);
    setErrorMessage('');
  };

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(generatedPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Confirm creation of new vault
  const handleConfirmCreate = async () => {
    setIsProcessing(true);
    try {
      const userId = await hashPhrase(generatedPhrase);
      await registerAccountOnEdge(generatedPhrase, userId);
      saveVaultSession(userId, generatedPhrase);

      const session: VaultSession = {
        userId,
        phraseSnippet: generatedPhrase.split(' ')[0] + ' ... ' + generatedPhrase.split(' ')[11],
        createdAt: Date.now(),
      };

      onLoginSuccess(session);
      onClose();
    } catch (e) {
      setErrorMessage('Failed to initialize cryptographic vault');
    } finally {
      setIsProcessing(false);
    }
  };

  // Restore existing vault from phrase
  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const clean = inputPhrase.trim().toLowerCase().replace(/\s+/g, ' ');
    const words = clean.split(' ');

    if (words.length !== 12) {
      setErrorMessage(`Please enter exactly 12 words (currently entered: ${words.length}).`);
      return;
    }

    if (!validateVaultPhrase(clean)) {
      setErrorMessage('Invalid BIP-39 recovery phrase checksum or unknown word.');
      return;
    }

    setIsProcessing(true);
    try {
      const userId = await hashPhrase(clean);
      saveVaultSession(userId, clean);

      const session: VaultSession = {
        userId,
        phraseSnippet: words[0] + ' ... ' + words[11],
        createdAt: Date.now(),
      };

      onLoginSuccess(session);
      onClose();
    } catch {
      setErrorMessage('Authentication verification failed.');
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
                {activeSession ? 'Vault Security' : 'Zero-Knowledge Vault'}
              </h2>
              <p className="modal-subtitle">
                {activeSession
                  ? 'Authenticated via cryptographic 12-word seed key'
                  : 'No SMS, no passwords, zero third-party lock-in'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* If user is already authenticated */}
        {activeSession ? (
          <div className="auth-session-view">
            <div className="vault-address-box">
              <div className="vault-address-row">
                <span className="vault-address-label">Public User ID:</span>
                <span className="vault-address-val">
                  {formatAccountId(activeSession.userId)}
                </span>
              </div>
              <div className="vault-sha-line">{activeSession.userId}</div>
            </div>

            <div className="vault-status-pill">
              <ShieldCheck size={16} className="text-emerald" />
              <span>Connected to Turso (libSQL) Edge Database</span>
            </div>

            <button className="vault-logout-btn" onClick={onLogout}>
              <LogOut size={16} />
              <span>Lock Vault & Log Out</span>
            </button>
          </div>
        ) : (
          <>
            {/* Tab Switcher */}
            <div className="auth-tabs">
              <button
                className={`auth-tab-pill ${tab === 'create' ? 'active' : ''}`}
                onClick={() => {
                  setTab('create');
                  setErrorMessage('');
                }}
              >
                Create New Vault
              </button>
              <button
                className={`auth-tab-pill ${tab === 'restore' ? 'active' : ''}`}
                onClick={() => {
                  setTab('restore');
                  setErrorMessage('');
                }}
              >
                Restore with 12 Words
              </button>
            </div>

            {errorMessage && (
              <div className="auth-error-banner">
                <AlertTriangle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* TAB 1: CREATE NEW VAULT */}
            {tab === 'create' && (
              <div className="auth-content-col">
                <div className="mnemonic-grid">
                  {generatedPhrase.split(' ').map((word, idx) => (
                    <div key={idx} className="mnemonic-chip">
                      <span className="chip-idx">{idx + 1}</span>
                      <span className="chip-word">{word}</span>
                    </div>
                  ))}
                </div>

                <div className="auth-actions-row">
                  <button
                    className="copy-phrase-btn"
                    onClick={handleCopyPhrase}
                    type="button"
                  >
                    {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                    <span>{copied ? 'Copied to Clipboard!' : 'Copy 12 Words'}</span>
                  </button>

                  <button
                    className="regen-btn"
                    onClick={handleRegenerate}
                    type="button"
                    title="Generate different words"
                  >
                    <RefreshCw size={13} />
                    <span>Regenerate</span>
                  </button>
                </div>

                <div className="auth-warning-box">
                  <AlertTriangle size={16} className="text-amber flex-shrink-0" />
                  <p className="auth-warning-text">
                    <strong>Zero-Knowledge Rule:</strong> Write down these 12 words in order.
                    We never store this phrase on any server. If you lose it, your itineraries
                    cannot be recovered by anyone.
                  </p>
                </div>

                <button
                  className="primary-modal-btn"
                  onClick={handleConfirmCreate}
                  disabled={isProcessing}
                >
                  <Lock size={15} />
                  <span>
                    {isProcessing ? 'Securing Vault...' : "I've Backed Up My 12 Words ➔ Enter Vault"}
                  </span>
                </button>
              </div>
            )}

            {/* TAB 2: RESTORE EXISTING VAULT */}
            {tab === 'restore' && (
              <form onSubmit={handleRestoreSubmit} className="auth-content-col">
                <label className="auth-input-label">
                  Paste or type your 12 recovery words:
                </label>
                <textarea
                  className="auth-textarea"
                  rows={3}
                  placeholder="e.g. apple breeze canyon velvet harbor matrix solar ticket..."
                  value={inputPhrase}
                  onChange={(e) => setInputPhrase(e.target.value)}
                  autoFocus
                />

                <div className="word-count-hint">
                  {inputPhrase.trim() ? inputPhrase.trim().split(/\s+/).length : 0} of 12 words entered
                </div>

                <button
                  type="submit"
                  className="primary-modal-btn"
                  disabled={isProcessing}
                >
                  <Key size={15} />
                  <span>{isProcessing ? 'Verifying...' : 'Unlock & Restore Vault'}</span>
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

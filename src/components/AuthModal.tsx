import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Copy,
  Key,
  Lock,
  LogOut,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
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
import { deleteAccountOnEdge, loginAccountOnEdge, registerAccountOnEdge } from '../auth/syncService';

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
  const [backedUpChecked, setBackedUpChecked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inputPhrase, setInputPhrase] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

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
    setBackedUpChecked(false);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(generatedPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // 1. Generate New Account Flow
  const handleConfirmCreate = async () => {
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
  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const clean = inputPhrase.trim().toLowerCase().replace(/\s+/g, ' ');
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
      setShowDeleteConfirm(false);
      onDeleteAccount();
      onClose();
    } catch {
      setErrorMessage('Failed to delete account from edge. Local storage was cleared.');
    } finally {
      setIsProcessing(false);
    }
  };

  const words = inputPhrase.trim() ? inputPhrase.trim().split(/\s+/) : [];

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

        {/* ================= ACTIVE SESSION VIEW ================= */}
        {activeSession ? (
          <div className="auth-session-view">
            {/* Account Details Card */}
            <div className="vault-address-box">
              <div className="vault-address-row">
                <span className="vault-address-label">Active Account ID:</span>
                <span className="vault-address-val font-mono font-bold text-blue">
                  {formatAccountId(activeSession.userId)}
                </span>
              </div>
              <div className="vault-sha-line font-mono">{activeSession.userId}</div>
            </div>

            <div className="vault-meta-grid">
              <div className="vault-meta-item">
                <ShieldCheck size={14} className="text-emerald" />
                <span>Edge Database: Turso (libSQL) Synced</span>
              </div>
              <div className="vault-meta-item">
                <Calendar size={14} className="text-slate" />
                <span>Created: {new Date(activeSession.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="vault-meta-item highlight-policy">
                <Clock size={14} className="text-amber" />
                <span>3-Month Policy: Active (Auto-purges if inactive &gt; 90 days)</span>
              </div>
            </div>

            {/* Error or Success alerts */}
            {errorMessage && (
              <div className="auth-error-banner mt-3">
                <AlertTriangle size={15} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Delete Confirmation Sub-Dialog */}
            {showDeleteConfirm ? (
              <div className="delete-account-confirm-box">
                <div className="delete-warning-header">
                  <ShieldAlert size={20} className="text-rose" />
                  <div>
                    <h4 className="delete-warning-title">Permanently Delete Account?</h4>
                    <p className="delete-warning-desc">
                      This action wipes your public User ID, all saved trip itineraries, flight records, and expenses from both your browser and the Edge database.
                    </p>
                  </div>
                </div>

                <div className="confirm-type-row">
                  <label className="auth-input-label">
                    Type <strong>DELETE</strong> to confirm permanent erasure:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                    placeholder="DELETE"
                    className="share-link-input text-center font-bold"
                    autoFocus
                  />
                </div>

                <div className="auth-actions-row mt-3">
                  <button
                    className="secondary-action-btn flex-1"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="delete-danger-btn flex-1"
                    disabled={deleteConfirmText !== 'DELETE' || isProcessing}
                    onClick={handleExecuteDelete}
                  >
                    <Trash2 size={15} />
                    <span>{isProcessing ? 'Erasing...' : 'Confirm Permanent Deletion'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="account-actions-stack">
                <button className="vault-logout-btn" onClick={onLogout}>
                  <LogOut size={16} />
                  <span>Lock Vault & Log Out</span>
                </button>

                <div className="danger-zone-strip">
                  <span className="danger-zone-title">Danger Zone</span>
                  <button
                    className="delete-trigger-btn"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 size={14} />
                    <span>Delete Current Account</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ================= UNAUTHENTICATED: USER FLOW ================= */
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

            {/* FLOW 1: GENERATE NEW ACCOUNT */}
            {activeTab === 'create' && (
              <div className="auth-content-col">
                <p className="flow-intro-text">
                  Your 12-word recovery phrase is your cryptographic master key. Write it down and keep it safe.
                </p>

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
                    title="Generate different 12-word combination"
                  >
                    <RefreshCw size={13} />
                    <span>Regenerate</span>
                  </button>
                </div>

                {/* Privacy & 3-Month Inactivity Notice */}
                <div className="auth-warning-box">
                  <AlertCircle size={16} className="text-amber flex-shrink-0" />
                  <div className="auth-warning-text">
                    <p><strong>Zero-Knowledge Rule:</strong> We never store your raw phrase on any server.</p>
                    <p className="mt-1 text-tertiary">
                      <strong>3-Month Retention Policy:</strong> Accounts not accessed for 3 months (90 days) are automatically deleted from edge databases and browser caches to ensure zero lingering data.
                    </p>
                  </div>
                </div>

                {/* Backup Confirmation Checkbox */}
                <label className="backup-checkbox-row">
                  <input
                    type="checkbox"
                    checked={backedUpChecked}
                    onChange={(e) => setBackedUpChecked(e.target.checked)}
                    className="backup-checkbox"
                  />
                  <span>I have safely backed up my 12 recovery words in a secure place.</span>
                </label>

                <button
                  className="primary-modal-btn"
                  onClick={handleConfirmCreate}
                  disabled={isProcessing || !backedUpChecked}
                >
                  <Lock size={15} />
                  <span>
                    {isProcessing ? 'Creating Account & Securing...' : 'Create Account & Enter Vault'}
                  </span>
                </button>
              </div>
            )}

            {/* FLOW 2: USE OLD KEY (RESTORE) */}
            {activeTab === 'restore' && (
              <form onSubmit={handleRestoreSubmit} className="auth-content-col">
                <p className="flow-intro-text">
                  Enter your previously generated 12-word recovery phrase to unlock your itineraries and cloud vault.
                </p>

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

                <div className="restore-helper-row">
                  <span className={`word-count-hint ${words.length === 12 ? 'text-emerald font-bold' : ''}`}>
                    {words.length} of 12 words entered
                  </span>
                  {words.length === 12 && (
                    <span className="checksum-hint text-emerald">
                      {validateVaultPhrase(inputPhrase) ? '✓ Valid Checksum' : '⚠️ Invalid Checksum'}
                    </span>
                  )}
                </div>

                <div className="auth-warning-box">
                  <Clock size={16} className="text-blue flex-shrink-0" />
                  <div className="auth-warning-text">
                    Logging in refreshes your account access activity and resets your 3-month retention counter.
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-modal-btn"
                  disabled={isProcessing || words.length !== 12}
                >
                  <Key size={15} />
                  <span>{isProcessing ? 'Verifying & Unlocking...' : 'Unlock & Restore Account'}</span>
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
};

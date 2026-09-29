import React, { useEffect, useState } from 'react';
import { Key, Lock, LogOut, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { VaultSession } from '../auth/crypto';
import { loginAccountOnEdge } from '../auth/syncService';
import { useModalA11y } from '../hooks';

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
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useModalA11y(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsProcessing(true);

    try {
      const ok = await loginAccountOnEdge(password.trim());
      if (ok) {
        const session: VaultSession = {
          authenticated: true,
          createdAt: Date.now(),
        };
        onLoginSuccess(session);
        onClose();
      } else {
        setErrorMessage('Incorrect password.');
      }
    } catch {
      setErrorMessage('Connection error while verifying password.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card auth-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="auth-header-icon bg-blue-subtle">
              <Lock size={18} className="text-blue" />
            </div>
            <div>
              <h2 id="auth-modal-title" className="modal-title">Personal Itinerary Vault</h2>
              <p className="modal-subtitle">
                {activeSession
                  ? 'Your vault is connected and synced'
                  : 'Enter your PASSWORD to connect'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {activeSession ? (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-sm">
              <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
              <div>
                <strong>Vault Active</strong>
                <p className="text-xs text-emerald-700">All trip changes sync automatically to your personal store.</p>
              </div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 px-4 border border-rose-300 hover:bg-rose-50 text-rose-700 font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut size={16} />
              <span>Lock Vault & Disconnect Session</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit} className="p-5 space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-modal-password" className="block text-xs font-semibold text-secondary mb-1.5">Password</label>
              <div className="relative flex items-center">
                <Key size={16} className="absolute left-3 text-tertiary" />
                <input
                  id="auth-modal-password"
                  type="password"
                  className="w-full pl-9 pr-3 py-2 border border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter PASSWORD"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || !password.trim()}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <Lock size={16} />
              <span>{isProcessing ? 'Verifying...' : 'Unlock Vault'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};


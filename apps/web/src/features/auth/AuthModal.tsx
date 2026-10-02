import React, { useEffect, useState } from 'react';
import { Key, Lock, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { VaultSession } from '../../auth/crypto';
import { loginAccountOnEdge } from '../../auth/syncService';
import { Modal } from '../../components/ui/Modal';
import { Input } from "../../components/ui/Input";

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

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMessage('');
    }
  }, [isOpen]);

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="auth-modal-card"
      title="Personal Itinerary Vault"
      subtitle={
        activeSession
          ? 'Your vault is connected and synced'
          : 'Enter your PASSWORD to connect'
      }
      icon={
        <div className="auth-header-icon bg-blue-subtle">
          <Lock size={18} className="text-blue" />
        </div>
      }
    >
        {activeSession ? (
          <div className="p-5 space-y-4">
            <div className="flex items-start gap-3 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-emerald-900 text-sm">
              <CheckCircle2 size={20} className="text-emerald-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-emerald-950">Vault Active & Secure</strong>
                <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                  All trip changes, bookings, and expense settlements synchronize automatically to your encrypted edge database.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="w-full py-2.5 px-4 border border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 font-semibold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
            >
              <LogOut size={16} />
              <span>Lock Vault & Disconnect Session</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleLoginSubmit} className="p-5 space-y-4">
            {errorMessage && (
              <div className="passcode-error-box" role="alert">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="passcode-input-group">
              <label htmlFor="auth-modal-password" className="passcode-label">
                <Key size={13} className="text-secondary" />
                Master Password
              </label>
              <div className="passcode-input-wrapper">
                <Key size={16} className="passcode-input-icon" />
                <Input
                  id="auth-modal-password"
                  type="password"
                  className="passcode-input"
                  placeholder="Enter master password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isProcessing || !password.trim()}
              className="passcode-submit-btn"
            >
              <Lock size={16} />
              <span>{isProcessing ? 'Verifying...' : 'Unlock Vault'}</span>
            </button>
          </form>
        )}
    </Modal>
  );
};


import React, { useState } from 'react';
import { KeyRound, Lock, LogIn, AlertCircle, X } from 'lucide-react';
import { loginAccountOnEdge } from '../../auth/syncService';
import { VaultSession } from '../../auth/crypto';

interface PasscodeAuthModalProps {
  isOpen: boolean;
  onSuccess: (session: VaultSession) => void;
  onClose?: () => void;
}

export const PasscodeAuthModal: React.FC<PasscodeAuthModalProps> = ({
  isOpen,
  onSuccess,
  onClose,
}) => {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const ok = await loginAccountOnEdge(password.trim());
      if (ok) {
        onSuccess({
          authenticated: true,
          createdAt: Date.now(),
        });
      } else {
        setError('Incorrect password. Please verify the PASSWORD in your environment.');
      }
    } catch {
      setError('Connection error. Could not verify password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop z-modal-top" onClick={onClose}>
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="auth-header-icon bg-blue-subtle">
              <Lock size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="modal-title">Personal Vault Access</h3>
              <p className="modal-subtitle">Enter your PASSWORD to access your personal itineraries</p>
            </div>
          </div>
          {onClose && (
            <button className="modal-close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="auth-form-body p-4 space-y-4">
          {error && (
            <div className="auth-warning-box text-rose-500 bg-rose-50 border border-rose-200 p-3 rounded-lg flex items-center gap-2 text-xs">
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="block text-xs font-semibold text-secondary mb-1.5">Password</label>
            <div className="relative flex items-center">
              <KeyRound size={16} className="absolute left-3 text-tertiary" />
              <input
                type="password"
                className="w-full pl-9 pr-3 py-2 border border-subtle rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter personal vault password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <LogIn size={16} />
            <span>{loading ? 'Verifying...' : 'Unlock Vault'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};

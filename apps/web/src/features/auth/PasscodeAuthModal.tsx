import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  X,
} from 'lucide-react';
import { loginAccountOnEdge } from '../../auth/syncService';
import { VaultSession } from '../../auth/crypto';
import { useModalA11y } from '../../hooks';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCapsLockOn, setIsCapsLockOn] = useState(false);

  useModalA11y(isOpen, onClose);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setError(null);
      setShowPassword(false);
      setIsCapsLockOn(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || loading) return;

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
        setError('Incorrect password. Please verify the PASSWORD set in your environment.');
      }
    } catch {
      setError('Connection error. Could not verify password with vault service.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyModifier = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setIsCapsLockOn(e.getModifierState('CapsLock'));
  };

  const cardContent = (
    <>
      {onClose && (
        <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close"
          style={{ position: 'absolute', top: 20, right: 20 }}
        >
          <X size={18} />
        </button>
      )}

      {/* Security Emblem */}
      <div className="passcode-icon-badge" aria-hidden="true">
        <Lock size={26} strokeWidth={2.2} />
      </div>

      <h1 id="passcode-auth-title" className="passcode-title">
        Personal Vault Access
      </h1>
      <p className="passcode-desc">
        Enter your master password to unlock and decrypt your itineraries, flight tickets, and vouchers.
      </p>

      <form onSubmit={handleSubmit} className="passcode-form">
        {error && (
          <div className="passcode-error-box" role="alert">
            <AlertCircle size={18} className="flex-shrink-0" style={{ marginTop: 1 }} />
            <span>{error}</span>
          </div>
        )}

        <div className="passcode-input-group">
          <div className="passcode-label-row">
            <label htmlFor="passcode-password" className="passcode-label">
              <KeyRound size={13} className="text-secondary" />
              Master Password
            </label>
            {isCapsLockOn && (
              <span className="passcode-caps-warning" title="Caps Lock is active">
                Caps Lock is ON
              </span>
            )}
          </div>

          <div className="passcode-input-wrapper">
            <KeyRound size={17} className="passcode-input-icon" />
            <Input
              id="passcode-password"
              type={showPassword ? 'text' : 'password'}
              className="passcode-input"
              placeholder="Enter master password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyModifier}
              onKeyUp={handleKeyModifier}
              autoFocus
              autoComplete="current-password"
              spellCheck={false}
              disabled={loading}
              error={!!error}
            />
            <button
              type="button"
              className="passcode-toggle-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <Button
          type="submit"
          disabled={!password.trim()}
          isLoading={loading}
          className="passcode-submit-btn"
          style={{ width: '100%', marginTop: '16px' }}
        >
          <span>Unlock Vault</span>
          <ArrowRight size={17} />
        </Button>
      </form>

      <div className="passcode-security-footer">
        <ShieldCheck size={14} className="text-emerald-600" />
        <span>Pure Zero-Knowledge & Cloudflare Edge Protected</span>
      </div>
    </>
  );

  // If used as full-page barrier (no onClose provided)
  if (!onClose) {
    return (
      <div className="passcode-auth-page">
        <div className="passcode-auth-ambient-glow" aria-hidden="true" />

        {/* Brand identity badge */}
        <div className="passcode-brand-row">
          <div className="passcode-brand-logo">
            <span role="img" aria-label="Plane">✈️</span>
            <span>Roammate</span>
          </div>
          <span className="passcode-brand-badge">Travel Vault</span>
        </div>

        <div
          className="passcode-auth-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="passcode-auth-title"
        >
          {cardContent}
        </div>
      </div>
    );
  }

  // If used as modal dialog inside authenticated shell
  return (
    <div className="modal-backdrop z-modal-top" onClick={onClose}>
      <div
        className="modal-card passcode-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="passcode-auth-title"
      >
        {cardContent}
      </div>
    </div>
  );
};

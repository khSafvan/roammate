import React, { useState } from 'react';
import { Check, Copy, Eye, EyeOff, Lock, RefreshCw, ShieldCheck } from 'lucide-react';
import { UI_CONFIG } from '../../config/constants';

interface CreateAccountViewProps {
  accountUuid: string;
  isProcessing: boolean;
  onRegenerateUuid: () => void;
  onSubmit: (password: string, backedUp: boolean) => void;
}

export const CreateAccountView: React.FC<CreateAccountViewProps> = ({
  accountUuid,
  isProcessing,
  onRegenerateUuid,
  onSubmit,
}) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [backedUpChecked, setBackedUpChecked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleCopyUuid = () => {
    navigator.clipboard.writeText(accountUuid);
    setCopied(true);
    setTimeout(() => setCopied(false), UI_CONFIG.CLIPBOARD_FEEDBACK_MS);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setValidationError('Passwords do not match.');
      return;
    }
    if (!backedUpChecked) {
      setValidationError('Please check the confirmation box below.');
      return;
    }

    onSubmit(password, backedUpChecked);
  };

  const isFormValid =
    password.length >= 6 &&
    password === confirmPassword &&
    backedUpChecked &&
    !isProcessing;

  return (
    <form onSubmit={handleSubmit} className="auth-content-col">
      <p className="flow-intro-text">
        Zero emails, zero phone numbers. Your unique <strong>Account UUID</strong> and <strong>Password</strong> secure your private travel vault.
      </p>

      {/* Generated Account UUID Display Card */}
      <div className="auth-uuid-card">
        <div className="auth-uuid-header">
          <span className="auth-uuid-label">Your Unique Account UUID</span>
          <button
            type="button"
            className="regen-btn"
            onClick={() => {
              setCopied(false);
              onRegenerateUuid();
            }}
            title="Generate a new UUID"
          >
            <RefreshCw size={13} />
            <span>Regenerate</span>
          </button>
        </div>

        <div className="auth-uuid-display font-mono">
          <span>{accountUuid}</span>
        </div>

        <button
          type="button"
          className="copy-phrase-btn w-full"
          onClick={handleCopyUuid}
        >
          {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
          <span>{copied ? 'Copied UUID to Clipboard!' : 'Copy Account UUID'}</span>
        </button>
      </div>

      {/* Password Inputs */}
      <div className="auth-fields-group">
        <label className="auth-input-label" htmlFor="create-password">
          Set Account Password
        </label>
        <div className="password-input-wrapper">
          <input
            id="create-password"
            type={showPassword ? 'text' : 'password'}
            className="auth-text-input font-sans"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setValidationError('');
            }}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <label className="auth-input-label mt-2" htmlFor="create-confirm-password">
          Confirm Password
        </label>
        <div className="password-input-wrapper">
          <input
            id="create-confirm-password"
            type={showPassword ? 'text' : 'password'}
            className="auth-text-input font-sans"
            placeholder="Re-enter password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setValidationError('');
            }}
            autoComplete="new-password"
          />
        </div>
      </div>

      {validationError && (
        <div className="text-rose text-xs font-medium mt-1">
          {validationError}
        </div>
      )}

      {/* Security & 3-Month Retention Notice */}
      <div className="auth-warning-box">
        <ShieldCheck size={16} className="text-emerald flex-shrink-0" />
        <div className="auth-warning-text">
          <p>
            <strong>Zero-Knowledge Hashing:</strong> Your password is cryptographically hashed with your UUID on your device before connecting to Turso edge DB.
          </p>
          <p className="mt-1 text-tertiary">
            <strong>3-Month Retention:</strong> Inactive accounts without login activity for 90 days are automatically pruned to guarantee zero lingering data.
          </p>
        </div>
      </div>

      {/* Confirmation Checkbox */}
      <label className="backup-checkbox-row">
        <input
          type="checkbox"
          checked={backedUpChecked}
          onChange={(e) => {
            setBackedUpChecked(e.target.checked);
            setValidationError('');
          }}
          className="backup-checkbox"
        />
        <span>I have saved my Account UUID and Password in a secure place.</span>
      </label>

      <button
        type="submit"
        className="primary-modal-btn"
        disabled={!isFormValid}
      >
        <Lock size={15} />
        <span>
          {isProcessing ? 'Securing & Initializing...' : 'Create Account & Enter Vault'}
        </span>
      </button>
    </form>
  );
};

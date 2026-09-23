import React, { useEffect, useState } from 'react';
import { Clock, Eye, EyeOff, Key, Shield, Smartphone } from 'lucide-react';
import { validateAccountUuid, validateVaultPhrase } from '../../auth/crypto';

interface RestoreAccountViewProps {
  isProcessing: boolean;
  prefilledUuid?: string;
  onSubmit: (identifier: string, password?: string) => void;
}

export const RestoreAccountView: React.FC<RestoreAccountViewProps> = ({
  isProcessing,
  prefilledUuid,
  onSubmit,
}) => {
  const [uuidOrPhrase, setUuidOrPhrase] = useState(prefilledUuid || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    if (prefilledUuid) {
      setUuidOrPhrase(prefilledUuid);
    }
  }, [prefilledUuid]);

  const trimmed = uuidOrPhrase.trim();
  const isMnemonic = trimmed.includes(' ') && trimmed.split(/\s+/).length === 12;
  const isUuid = validateAccountUuid(trimmed);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!trimmed) {
      setValidationError('Please enter your Account UUID or recovery phrase.');
      return;
    }

    if (isMnemonic) {
      if (!validateVaultPhrase(trimmed)) {
        setValidationError('Invalid 12-word recovery phrase checksum.');
        return;
      }
      onSubmit(trimmed);
      return;
    }

    if (!isUuid) {
      setValidationError('Please enter a valid Account UUID (e.g. 12345678-1234-4xxx-yxxx-xxxxxxxxxxxx).');
      return;
    }

    if (!password) {
      setValidationError('Please enter your account password.');
      return;
    }

    onSubmit(trimmed, password);
  };

  const isFormValid =
    (isUuid && password.length >= 1) ||
    (isMnemonic && validateVaultPhrase(trimmed));

  return (
    <form onSubmit={handleSubmit} className="auth-content-col">
      {prefilledUuid ? (
        <div className="scanned-qr-banner">
          <Smartphone size={16} className="text-emerald flex-shrink-0" />
          <div className="text-xs text-primary leading-tight">
            <strong>Scanned Vault QR Code:</strong> Enter your password to connect this new browser to your account.
          </div>
        </div>
      ) : (
        <p className="flow-intro-text">
          Enter your <strong>Account UUID</strong> and <strong>Password</strong> to unlock your cloud vault on this device.
        </p>
      )}

      <div className="auth-fields-group">
        <label className="auth-input-label" htmlFor="restore-uuid">
          Account UUID (or 12-Word Recovery Phrase)
        </label>
        <input
          id="restore-uuid"
          type="text"
          className="auth-text-input font-mono"
          placeholder="e.g. 9f8b417e-3294-4cd0-9aa8-ec16d4ea71b2"
          value={uuidOrPhrase}
          onChange={(e) => {
            setUuidOrPhrase(e.target.value);
            setValidationError('');
          }}
          autoFocus={!prefilledUuid}
        />

        {isMnemonic ? (
          <div className="text-emerald text-xs font-medium mt-1 flex items-center gap-1">
            <Shield size={12} />
            <span>Legacy 12-word recovery phrase detected</span>
          </div>
        ) : (
          <>
            <label className="auth-input-label mt-2" htmlFor="restore-password">
              Account Password
            </label>
            <div className="password-input-wrapper">
              <input
                id="restore-password"
                type={showPassword ? 'text' : 'password'}
                className="auth-text-input font-sans"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setValidationError('');
                }}
                autoComplete="current-password"
                autoFocus={!!prefilledUuid}
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
          </>
        )}
      </div>

      {validationError && (
        <div className="text-rose text-xs font-medium mt-1">
          {validationError}
        </div>
      )}

      <div className="auth-warning-box">
        <Clock size={16} className="text-blue flex-shrink-0" />
        <div className="auth-warning-text">
          Password is only needed once when logging in from a new browser or device.
        </div>
      </div>

      <button
        type="submit"
        className="primary-modal-btn"
        disabled={isProcessing || !isFormValid}
      >
        <Key size={15} />
        <span>{isProcessing ? 'Verifying & Unlocking...' : 'Unlock & Restore Account'}</span>
      </button>
    </form>
  );
};

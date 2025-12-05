import React, { useState } from 'react';
import { Clock, Key } from 'lucide-react';
import { validateVaultPhrase } from '../../auth/crypto';

interface RestoreAccountViewProps {
  isProcessing: boolean;
  onSubmit: (phrase: string) => void;
}

export const RestoreAccountView: React.FC<RestoreAccountViewProps> = ({
  isProcessing,
  onSubmit,
}) => {
  const [inputPhrase, setInputPhrase] = useState('');

  const words = inputPhrase.trim() ? inputPhrase.trim().split(/\s+/) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(inputPhrase);
  };

  return (
    <form onSubmit={handleSubmit} className="auth-content-col">
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
  );
};

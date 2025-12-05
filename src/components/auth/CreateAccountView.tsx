import React, { useState } from 'react';
import { AlertCircle, Check, Copy, Lock, RefreshCw } from 'lucide-react';
import { UI_CONFIG } from '../../config/constants';

interface CreateAccountViewProps {
  phrase: string;
  isProcessing: boolean;
  onRegenerate: () => void;
  onSubmit: (backedUp: boolean) => void;
}

export const CreateAccountView: React.FC<CreateAccountViewProps> = ({
  phrase,
  isProcessing,
  onRegenerate,
  onSubmit,
}) => {
  const [backedUpChecked, setBackedUpChecked] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyPhrase = () => {
    navigator.clipboard.writeText(phrase);
    setCopied(true);
    setTimeout(() => setCopied(false), UI_CONFIG.CLIPBOARD_FEEDBACK_MS);
  };

  const words = phrase ? phrase.trim().split(/\s+/) : [];

  return (
    <div className="auth-content-col">
      <p className="flow-intro-text">
        Your 12-word recovery phrase is your cryptographic master key. Write it down and keep it safe.
      </p>

      <div className="mnemonic-grid">
        {words.map((word, idx) => (
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
          onClick={() => {
            setCopied(false);
            setBackedUpChecked(false);
            onRegenerate();
          }}
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
        onClick={() => onSubmit(backedUpChecked)}
        disabled={isProcessing || !backedUpChecked}
      >
        <Lock size={15} />
        <span>
          {isProcessing ? 'Creating Account & Securing...' : 'Create Account & Enter Vault'}
        </span>
      </button>
    </div>
  );
};

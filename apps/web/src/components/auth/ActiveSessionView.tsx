import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Copy,
  LogOut,
  QrCode,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { formatAccountId, VaultSession } from '../../auth/crypto';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { VaultQrCodeModal } from './VaultQrCodeModal';

interface ActiveSessionViewProps {
  activeSession: VaultSession;
  errorMessage?: string;
  isProcessing: boolean;
  onLogout: () => void;
  onDeleteAccount: () => void;
}

export const ActiveSessionView: React.FC<ActiveSessionViewProps> = ({
  activeSession,
  errorMessage,
  isProcessing,
  onLogout,
  onDeleteAccount,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyId = () => {
    navigator.clipboard.writeText(activeSession.userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="auth-session-view">
      {/* Account Details Card */}
      <div className="vault-address-box">
        <div className="vault-address-row">
          <span className="vault-address-label">Active Account UUID:</span>
          <span className="vault-address-val font-mono font-bold text-blue">
            {formatAccountId(activeSession.userId)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-1">
          <div className="vault-sha-line font-mono flex-1">{activeSession.userId}</div>
          <button
            type="button"
            className="copy-phrase-btn py-1 px-2 text-xs flex-shrink-0"
            onClick={handleCopyId}
            title="Copy full Account UUID"
          >
            {copied ? <Check size={13} className="text-emerald" /> : <Copy size={13} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        <button
          type="button"
          className="qr-view-trigger-btn w-full mt-2"
          onClick={() => setShowQrModal(true)}
          title="Open QR code to scan and log in from your phone or another browser"
        >
          <QrCode size={14} />
          <span>Download / View Login QR Code</span>
        </button>
      </div>

      <VaultQrCodeModal
        isOpen={showQrModal}
        accountUuid={activeSession.userId}
        onClose={() => setShowQrModal(false)}
      />

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

      {/* Error alerts */}
      {errorMessage && (
        <div className="auth-error-banner mt-3">
          <AlertTriangle size={15} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Delete Confirmation Sub-Dialog or Action Stack */}
      {showDeleteConfirm ? (
        <DeleteAccountDialog
          isProcessing={isProcessing}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirmDelete={onDeleteAccount}
        />
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
  );
};

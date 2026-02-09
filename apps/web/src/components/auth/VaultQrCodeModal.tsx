import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Check, Copy, Download, QrCode, Smartphone, X } from 'lucide-react';
import { formatAccountId } from '../../auth/crypto';

interface VaultQrCodeModalProps {
  isOpen: boolean;
  accountUuid: string;
  onClose: () => void;
}

export const VaultQrCodeModal: React.FC<VaultQrCodeModalProps> = ({
  isOpen,
  accountUuid,
  onClose,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState(false);

  const loginUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?account=${encodeURIComponent(accountUuid)}`
    : '';

  useEffect(() => {
    if (isOpen && accountUuid) {
      QRCode.toDataURL(loginUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0F172A',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('Failed to generate QR code:', err));
    }
  }, [isOpen, accountUuid, loginUrl]);

  if (!isOpen) return null;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(loginUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `roammate-vault-${accountUuid.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-backdrop z-modal-top" onClick={onClose}>
      <div className="modal-card qr-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="auth-header-icon bg-blue-subtle">
              <QrCode size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="modal-title">Vault Quick-Login QR Code</h3>
              <p className="modal-subtitle">
                Scan from any phone or browser to log in with your password
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* QR Code Presentation Box */}
        <div className="qr-presentation-col">
          <div className="qr-image-container">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt={`roammate Login QR for ${accountUuid}`}
                className="qr-image"
              />
            ) : (
              <div className="qr-loading-placeholder">
                <span>Generating secure QR code...</span>
              </div>
            )}
          </div>

          <div className="qr-account-badge">
            <span className="text-secondary font-medium text-xs">Account:</span>
            <span className="font-mono font-bold text-xs text-blue">
              {formatAccountId(accountUuid)}
            </span>
          </div>

          {/* Action Row: Download PNG & Copy Link */}
          <div className="qr-actions-row">
            <button
              type="button"
              className="primary-modal-btn flex-1"
              onClick={handleDownloadQr}
              disabled={!qrDataUrl}
            >
              <Download size={15} />
              <span>Download QR Code (.png)</span>
            </button>

            <button
              type="button"
              className="secondary-action-btn"
              onClick={handleCopyUrl}
              title="Copy Quick-Login URL"
            >
              {copiedUrl ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
              <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
            </button>
          </div>

          {/* Guidance Callout */}
          <div className="auth-warning-box mt-2">
            <Smartphone size={16} className="text-blue flex-shrink-0" />
            <div className="auth-warning-text">
              <p>
                <strong>Cross-Device Access:</strong> Scanning this QR code opens roammate on your phone or new device and prompts for your password once.
              </p>
              <p className="mt-1 text-tertiary">
                Your password is only required the first time you connect from a new browser.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

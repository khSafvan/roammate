import React, { useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  FileJson,
  Globe,
  Share2,
  Upload,
  X,
} from 'lucide-react';
import { Trip } from '../types/trip';
import {
  exportItinerary,
  getShareUrl,
  importItineraryFile,
} from '../utils/exportImport';

interface ShareModalProps {
  isOpen: boolean;
  trip: Trip;
  onImportSuccess: (importedTrip: Trip) => void;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  trip,
  onImportSuccess,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const shareUrl = getShareUrl(trip.shareToken || 'tokyo88x');

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadFile = () => {
    exportItinerary(trip);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportError('');
    try {
      const imported = await importItineraryFile(file);
      onImportSuccess(imported);
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse itinerary JSON.');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="auth-header-icon">
              <Share2 size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="modal-title">Share & Export Itinerary</h3>
              <p className="modal-subtitle">Portable JSON file or zero-login read-only link</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="auth-content-col">
          {/* Method B: One-Click Read-Only Share Link */}
          <div className="share-option-card">
            <div className="share-option-header">
              <Globe size={16} className="text-blue" />
              <span className="share-option-title">Method B: Instant Read-Only Link</span>
            </div>
            <p className="share-option-desc">
              Friends can view flights, timeline, weather, and expenses in their browser without an account.
            </p>

            <div className="share-link-box">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="share-link-input"
              />
              <button className="copy-phrase-btn" onClick={handleCopyLink}>
                {copied ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Method A: Universal Portable JSON File */}
          <div className="share-option-card">
            <div className="share-option-header">
              <FileJson size={16} className="text-amber" />
              <span className="share-option-title">Method A: Universal Portable JSON File</span>
            </div>
            <p className="share-option-desc">
              Send the raw itinerary document via WhatsApp, AirDrop, or email for other MojoLog travelers to import.
            </p>

            <div className="auth-actions-row">
              <button className="secondary-action-btn flex-1" onClick={handleDownloadFile}>
                <Download size={15} />
                <span>Export (.json)</span>
              </button>

              <button
                className="secondary-action-btn flex-1"
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
              >
                <Upload size={15} />
                <span>{isImporting ? 'Importing...' : 'Import (.json)'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,.itinerary"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            {importError && (
              <div className="auth-error-banner mt-2">
                <span>{importError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

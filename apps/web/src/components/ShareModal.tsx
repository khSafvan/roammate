import React, { useRef, useState } from 'react';
import {
  Calendar,
  Check,
  Copy,
  Download,
  FileJson,
  KeyRound,
  Printer,
  RefreshCw,
  ShieldCheck,
  Upload,
  UserPlus,
  X,
} from 'lucide-react';
import { Trip } from '../types/trip';
import {
  exportItinerary,
  importItineraryFile,
} from '../utils/exportImport';
import { downloadIcsCalendar } from '../utils/icalExport';

interface ShareModalProps {
  isOpen: boolean;
  trip: Trip;
  onUpdateTrip?: (updated: Partial<Trip>) => void;
  onImportSuccess: (importedTrip: Trip) => void;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  trip,
  onUpdateTrip,
  onImportSuccess,
  onClose,
}) => {
  const [copiedGuest, setCopiedGuest] = useState(false);
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Secret guest link containing the guestKey
  const activeGuestKey = trip.guestKey || trip.shareToken || 'guest_key';
  const guestInviteUrl = `${window.location.origin}/?trip=${encodeURIComponent(
    trip.id
  )}&guest=${encodeURIComponent(activeGuestKey)}`;

  const handleCopyGuestLink = () => {
    navigator.clipboard.writeText(guestInviteUrl);
    setCopiedGuest(true);
    setTimeout(() => setCopiedGuest(false), 2500);
  };

  const handleRegenerateGuestKey = () => {
    const newGuestKey = `guest_${Math.random().toString(36).substring(2, 12)}`;
    if (onUpdateTrip) {
      onUpdateTrip({ guestKey: newGuestKey });
    }
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
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="auth-header-icon">
              <UserPlus size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="modal-title">Invite Companions &amp; Share Trip</h3>
              <p className="modal-subtitle">
                Private guest access or universal JSON export
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="auth-content-col">
          {/* Method 1: Secret Companion Guest Link */}
          <div className="share-option-card">
            <div className="share-option-header">
              <div className="flex items-center gap-2">
                <KeyRound size={16} className="text-blue" />
                <span className="share-option-title">Private Companion Guest Link</span>
              </div>
              <button
                type="button"
                className="regen-btn"
                onClick={handleRegenerateGuestKey}
                title="Invalidate current link and create a new secret key"
              >
                <RefreshCw size={12} />
                <span>New Key</span>
              </button>
            </div>

            <div className="share-privacy-notice">
              <ShieldCheck size={14} className="text-emerald flex-shrink-0" />
              <span>
                <strong>Privacy Guaranteed:</strong> Only individuals with this secret guest link can view this trip. Uninvited visitors cannot see your itinerary.
              </span>
            </div>

            <p className="share-option-desc mt-2">
              Friends can preview your itinerary, flights, and expenses. They can also click <strong>&quot;Join Trip&quot;</strong> to create an account and save a copy into their own private vault.
            </p>

            <div className="share-link-box">
              <input
                type="text"
                readOnly
                value={guestInviteUrl}
                className="share-link-input font-mono text-xs"
              />
              <button className="copy-phrase-btn flex-shrink-0" onClick={handleCopyGuestLink}>
                {copiedGuest ? (
                  <Check size={14} className="text-emerald" />
                ) : (
                  <Copy size={14} />
                )}
                <span>{copiedGuest ? 'Copied!' : 'Copy Guest Link'}</span>
              </button>
            </div>
          </div>

          {/* Method 2: Universal Portable JSON File */}
          <div className="share-option-card">
            <div className="share-option-header">
              <div className="flex items-center gap-2">
                <FileJson size={16} className="text-amber" />
                <span className="share-option-title">Universal Portable JSON File</span>
              </div>
            </div>
            <p className="share-option-desc">
              Backup or transfer the raw trip file directly via WhatsApp, AirDrop, or email for other travelers to import.
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

          {/* Method 3: iCalendar (.ics) Calendar Feed (Feature F8) */}
          <div className="share-option-card">
            <div className="share-option-header">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue" />
                <span className="share-option-title">iCalendar (.ics) RFC 5545 Sync</span>
              </div>
            </div>
            <p className="share-option-desc">
              Sync all flights, hotel stays, and timed itinerary stops with Google Calendar, Apple Calendar (iOS / macOS), or Outlook.
            </p>

            <button
              className="primary-action-btn w-full flex items-center justify-center gap-2"
              onClick={() => downloadIcsCalendar(trip)}
            >
              <Calendar size={15} />
              <span>Download iCalendar (.ics)</span>
            </button>
          </div>

          {/* Method 4: Printable Travel Packet (Feature F10) */}
          <div className="share-option-card">
            <div className="share-option-header">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-slate" />
                <span className="share-option-title">Print Emergency Travel Packet</span>
              </div>
            </div>
            <p className="share-option-desc">
              Formatted printer-friendly packet with flights, vouchers, hotel reservations, and daily schedules for offline emergency paper backup.
            </p>

            <button
              className="secondary-action-btn w-full flex items-center justify-center gap-2"
              onClick={() => window.print()}
            >
              <Printer size={15} />
              <span>Print Travel Packet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


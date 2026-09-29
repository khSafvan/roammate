import React, { useRef, useState } from 'react';
import {
  Calendar,
  Download,
  FileJson,
  Printer,
  Upload,
  X,
} from 'lucide-react';
import { Trip } from '../types/trip';
import {
  exportItinerary,
  importItineraryFile,
} from '../utils/exportImport';
import { downloadIcsCalendar } from '@mojolog/core';
import { useModalA11y } from '../hooks';

interface ShareModalProps {
  isOpen: boolean;
  trip: Trip;
  onImportSuccess: (importedTrip: Trip) => void;
  onClose: () => void;
  onUpdateTrip?: (updated: Partial<Trip>) => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  trip,
  onImportSuccess,
  onClose,
}) => {
  const [importError, setImportError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

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
        style={{ maxWidth: '540px' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="auth-header-icon">
              <Download size={18} className="text-blue" />
            </div>
            <div>
              <h3 id="share-modal-title" className="modal-title">Export & Travel Packet</h3>
              <p className="modal-subtitle">
                Backup your itinerary, sync to calendar, or print paper passes
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="auth-content-col">
          {/* Option 1: Universal Portable JSON File */}
          <div className="share-option-card">
            <div className="share-option-header">
              <div className="flex items-center gap-2">
                <FileJson size={16} className="text-amber" />
                <span className="share-option-title">Universal Portable JSON File</span>
              </div>
            </div>
            <p className="share-option-desc">
              Export an encrypted or raw trip document for offline backup, migration, or importing later.
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

          {/* Option 2: iCalendar (.ics) Calendar Feed */}
          <div className="share-option-card">
            <div className="share-option-header">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-blue" />
                <span className="share-option-title">iCalendar (.ics) Calendar Sync</span>
              </div>
            </div>
            <p className="share-option-desc">
              Import all flights, hotel stays, and timed itinerary stops into Google Calendar, Apple Calendar, or Outlook.
            </p>

            <button
              className="primary-action-btn w-full flex items-center justify-center gap-2"
              onClick={() => downloadIcsCalendar(trip)}
            >
              <Calendar size={15} />
              <span>Download iCalendar (.ics)</span>
            </button>
          </div>

          {/* Option 3: Printable Travel Packet */}
          <div className="share-option-card">
            <div className="share-option-header">
              <div className="flex items-center gap-2">
                <Printer size={16} className="text-slate" />
                <span className="share-option-title">Print Emergency Travel Packet</span>
              </div>
            </div>
            <p className="share-option-desc">
              Printer-friendly offline document with flight boarding passes, hotel reservations, and daily schedules.
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

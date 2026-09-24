import React, { useState } from 'react';
import { FileText, PhoneCall, Save, Wifi, X } from 'lucide-react';
import { Trip, TripDay } from '../types/trip';

interface ScratchpadModalProps {
  isOpen: boolean;
  trip: Trip;
  activeDay?: TripDay;
  onUpdateTrip: (updated: Partial<Trip>) => void;
  onClose: () => void;
}

export const ScratchpadModal: React.FC<ScratchpadModalProps> = ({
  isOpen,
  trip,
  activeDay,
  onUpdateTrip,
  onClose,
}) => {
  const [emergencyContacts, setEmergencyContacts] = useState(trip.emergencyContacts || '');
  const [generalNotes, setGeneralNotes] = useState(trip.generalNotes || '');
  const [dayNotes, setDayNotes] = useState(activeDay?.notes || '');
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const updatedDays = activeDay
      ? (trip.days || []).map((d) => (d.id === activeDay.id ? { ...d, notes: dayNotes.trim() || undefined } : d))
      : trip.days;

    onUpdateTrip({
      emergencyContacts: emergencyContacts.trim() || undefined,
      generalNotes: generalNotes.trim() || undefined,
      days: updatedDays,
    });

    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onClose();
    }, 800);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '620px', maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div
              className="stop-badge-lg"
              style={{ backgroundColor: '#F59E0B' }}
            >
              <FileText size={18} />
            </div>
            <div>
              <h2 className="modal-title">Trip Scratchpad &amp; Emergency Notes</h2>
              <p className="modal-subtitle">
                Quick-reference contacts, embassy details, wifi codes &amp; day notes
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="auth-content-col">
          {/* Emergency & Embassy Contacts */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <PhoneCall size={14} className="text-red-500" />
              <span>Emergency Contacts &amp; Embassy Details</span>
            </label>
            <textarea
              className="form-input text-xs font-mono"
              rows={4}
              placeholder="e.g. Police: 999, Embassy: +971 4 309 4000, Insurance Policy #..."
              value={emergencyContacts}
              onChange={(e) => setEmergencyContacts(e.target.value)}
            />
          </div>

          {/* General Notes & Wifi codes */}
          <div>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Wifi size={14} className="text-blue" />
              <span>General Trip Notes, Wifi Passwords &amp; Codes</span>
            </label>
            <textarea
              className="form-input text-xs font-mono"
              rows={4}
              placeholder="e.g. Hotel Wifi: PalaceGuest / pass123, Door code: #8821, Metro card balance..."
              value={generalNotes}
              onChange={(e) => setGeneralNotes(e.target.value)}
            />
          </div>

          {/* Active Day Notes */}
          {activeDay && (
            <div>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={14} style={{ color: activeDay.themeColor }} />
                <span>Day {activeDay.dayNumber} Specific Notes ({activeDay.dateStr})</span>
              </label>
              <textarea
                className="form-input text-xs"
                rows={3}
                placeholder={`Specific reminders for Day ${activeDay.dayNumber}...`}
                value={dayNotes}
                onChange={(e) => setDayNotes(e.target.value)}
              />
            </div>
          )}

          <div className="modal-actions-row mt-2">
            <button type="button" className="secondary-action-btn flex-1" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-modal-btn flex-1">
              <Save size={15} />
              <span>{isSaved ? 'Saved!' : 'Save Scratchpad'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

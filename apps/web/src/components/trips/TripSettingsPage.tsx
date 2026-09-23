import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Compass,
  Copy,
  DollarSign,
  Download,
  KeyRound,
  MapPin,
  Palette,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Trip } from '../../types/trip';
import { exportItinerary } from '../../utils/exportImport';

interface TripSettingsPageProps {
  trip: Trip;
  onUpdateTrip: (updated: Partial<Trip>) => void;
  onDeleteTrip: (tripId: string) => void;
  onBackToWorkspace: () => void;
}

const THEME_COLORS = [
  { name: 'Sky Blue', hex: '#3B82F6' },
  { name: 'Coral Red', hex: '#FF5A5F' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Purple Sunset', hex: '#8B5CF6' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Slate Calm', hex: '#64748B' },
];

const CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'CAD', 'AUD', 'CHF', 'SGD'];

export const TripSettingsPage: React.FC<TripSettingsPageProps> = ({
  trip,
  onUpdateTrip,
  onDeleteTrip,
  onBackToWorkspace,
}) => {
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination);
  const [startDate, setStartDate] = useState(trip.startDate || '');
  const [endDate, setEndDate] = useState(trip.endDate || '');
  const [startTime, setStartTime] = useState(trip.startTime || '09:00');
  const [endTime, setEndTime] = useState(trip.endTime || '21:00');
  const [baseCurrency, setBaseCurrency] = useState(trip.baseCurrency || 'USD');
  const [themeColor, setThemeColor] = useState(trip.days?.[0]?.themeColor || '#3B82F6');
  const [guestKey, setGuestKey] = useState(trip.guestKey || trip.shareToken || 'guest_key');

  const [copiedLink, setCopiedLink] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  // Secret guest link
  const guestInviteUrl = `${window.location.origin}/?trip=${encodeURIComponent(
    trip.id
  )}&guest=${encodeURIComponent(guestKey)}`;

  const handleCopyGuestLink = () => {
    navigator.clipboard.writeText(guestInviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleRegenerateKey = () => {
    const newKey = `guest_${Math.random().toString(36).substring(2, 12)}`;
    setGuestKey(newKey);
    onUpdateTrip({ guestKey: newKey });
  };

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formattedDates =
      startDate && endDate ? `${startDate} – ${endDate}` : trip.dates;

    onUpdateTrip({
      title: title.trim() || trip.title,
      destination: destination.trim() || trip.destination,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      dates: formattedDates,
      baseCurrency,
      guestKey,
    });

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="settings-page-root">
      {/* Top Header & Breadcrumb */}
      <header className="header-root">
        <div className="header-container">
          <div className="header-left">
            <button
              className="breadcrumb-back-btn"
              onClick={onBackToWorkspace}
              title="Return to Itinerary Workspace"
            >
              <ArrowLeft size={16} />
              <span>Back to Itinerary</span>
            </button>
            <div className="header-meta">
              <h1 className="trip-title">Trip Settings · {trip.title}</h1>
              <span className="text-xs text-secondary">{trip.destination}</span>
            </div>
          </div>

          <div className="header-actions">
            <button
              className={`primary-action-btn ${isSaved ? 'bg-emerald' : ''}`}
              onClick={() => handleSave()}
            >
              {isSaved ? <Check size={14} /> : <Save size={14} />}
              <span>{isSaved ? 'Changes Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Settings Grid */}
      <main className="settings-content-container">
        {/* Section 1: Trip Identity */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-node">
              <Compass size={17} className="text-blue" />
            </div>
            <div>
              <h2 className="settings-section-title">Trip Identity &amp; Destination</h2>
              <p className="settings-section-subtitle">
                General display name, destination country/city, and currency
              </p>
            </div>
          </div>

          <div className="settings-fields-stack">
            <div className="form-group">
              <label className="form-label">Trip Title</label>
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">
                  <MapPin size={12} className="inline mr-1" />
                  Destination
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <DollarSign size={12} className="inline mr-1" />
                  Base Currency
                </label>
                <select
                  className="form-input"
                  value={baseCurrency}
                  onChange={(e) => setBaseCurrency(e.target.value)}
                >
                  {CURRENCIES.map((cur) => (
                    <option key={cur} value={cur}>
                      {cur}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Theme Color Picker */}
            <div className="form-group">
              <label className="form-label">
                <Palette size={12} className="inline mr-1" />
                Theme Accent Color
              </label>
              <div className="color-swatch-row">
                {THEME_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    className={`color-swatch-btn ${themeColor === c.hex ? 'active' : ''}`}
                    style={{ backgroundColor: c.hex }}
                    onClick={() => setThemeColor(c.hex)}
                    title={c.name}
                  >
                    {themeColor === c.hex && <Check size={13} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Dates & Schedule Timing */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-node">
              <Calendar size={17} className="text-blue" />
            </div>
            <div>
              <h2 className="settings-section-title">Dates &amp; Daily Schedule</h2>
              <p className="settings-section-subtitle">
                Calendar span and daily start/end operating intervals
              </p>
            </div>
          </div>

          <div className="settings-fields-stack">
            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label">
                  <Clock size={12} className="inline mr-1" />
                  Default Daily Start Time
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <Clock size={12} className="inline mr-1" />
                  Default Daily End Time
                </label>
                <input
                  type="time"
                  className="form-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Privacy & Companion Guest Links */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-node">
              <KeyRound size={17} className="text-blue" />
            </div>
            <div>
              <h2 className="settings-section-title">Privacy &amp; Companion Guest Link</h2>
              <p className="settings-section-subtitle">
                Only individuals with this secret key can view your itinerary
              </p>
            </div>
          </div>

          <div className="settings-fields-stack">
            <div className="share-privacy-notice">
              <ShieldCheck size={16} className="text-emerald flex-shrink-0" />
              <span>
                <strong>Private Vault Policy:</strong> This trip is inaccessible to anyone without the secret invitation key. If shared accidentally, click <strong>&quot;Regenerate Key&quot;</strong> to immediately invalidate the old link.
              </span>
            </div>

            <div className="form-group">
              <div className="flex items-center justify-between mb-1">
                <label className="form-label">Secret Guest Invite Link</label>
                <button
                  type="button"
                  className="regen-btn"
                  onClick={handleRegenerateKey}
                  title="Generate a new secret key and invalidate old link"
                >
                  <RefreshCw size={12} />
                  <span>Regenerate Key</span>
                </button>
              </div>

              <div className="share-link-box">
                <input
                  type="text"
                  readOnly
                  value={guestInviteUrl}
                  className="share-link-input font-mono text-xs"
                />
                <button
                  type="button"
                  className="copy-phrase-btn flex-shrink-0"
                  onClick={handleCopyGuestLink}
                >
                  {copiedLink ? <Check size={14} className="text-emerald" /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Guest Link'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Data Management & Danger Zone */}
        <div className="settings-card danger-card">
          <div className="settings-card-header">
            <div className="settings-icon-node danger-node">
              <Trash2 size={17} className="text-rose" />
            </div>
            <div>
              <h2 className="settings-section-title">Data Backup &amp; Danger Zone</h2>
              <p className="settings-section-subtitle">
                Export universal JSON document or permanently delete itinerary
              </p>
            </div>
          </div>

          <div className="settings-fields-stack">
            <div className="settings-action-row">
              <div>
                <strong>Export Portable Backup (.json)</strong>
                <p className="text-xs text-secondary mt-0.5">
                  Save a local JSON document with all stops, flights, and expenses.
                </p>
              </div>
              <button
                type="button"
                className="secondary-action-btn"
                onClick={() => exportItinerary(trip)}
              >
                <Download size={14} />
                <span>Export JSON</span>
              </button>
            </div>

            <div className="settings-danger-row">
              <div>
                <strong className="text-rose">Permanently Delete Trip</strong>
                <p className="text-xs text-secondary mt-0.5">
                  Removes this trip from both your local vault and Turso edge database.
                </p>
              </div>

              {isDeleteConfirming ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="cancel-delete-btn"
                    onClick={() => setIsDeleteConfirming(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="confirm-delete-btn"
                    onClick={() => onDeleteTrip(trip.id)}
                  >
                    Confirm Permanent Delete
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="delete-trigger-btn"
                  onClick={() => setIsDeleteConfirming(true)}
                >
                  <Trash2 size={14} />
                  <span>Delete Trip</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

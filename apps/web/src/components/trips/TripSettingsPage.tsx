import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Check,
  Clock,
  Compass,
  DollarSign,
  Download,
  FileText,
  Lock,
  LogOut,
  MapPin,
  Palette,
  PhoneCall,
  Printer,
  Save,
  ShieldCheck,
  Trash2,
  Users,
  Plus,
} from 'lucide-react';
import { Trip } from '../../types/trip';
import { exportItinerary } from '../../utils/exportImport';
import { Header } from '../Header';
import { VaultSession } from '../../auth/crypto';

interface TripSettingsPageProps {
  trip: Trip;
  onUpdateTrip: (updated: Partial<Trip>) => void;
  onDeleteTrip: (tripId: string) => void;
  onBackToWorkspace: () => void;
  activeSession?: VaultSession | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}

const THEME_COLORS = [
  { name: 'Sky Blue', hex: '#3B82F6' },
  { name: 'Coral Red', hex: '#FF5A5F' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Purple Sunset', hex: '#8B5CF6' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Slate Calm', hex: '#64748B' },
];

const CURRENCIES = ['USD', 'EUR', 'JPY', 'GBP', 'CAD', 'AUD', 'CHF', 'SGD', 'AED', 'MYR', 'INR', 'THB', 'IDR'];

export const TripSettingsPage: React.FC<TripSettingsPageProps> = ({
  trip,
  onUpdateTrip,
  onDeleteTrip,
  onBackToWorkspace,
  activeSession,
  onOpenAuth,
  onLogout,
}) => {
  const [title, setTitle] = useState(trip.title);
  const [destination, setDestination] = useState(trip.destination);
  const [startDate, setStartDate] = useState(trip.startDate || '');
  const [endDate, setEndDate] = useState(trip.endDate || '');
  const [startTime, setStartTime] = useState(trip.startTime || '09:00');
  const [endTime, setEndTime] = useState(trip.endTime || '21:00');
  const [baseCurrency, setBaseCurrency] = useState(trip.baseCurrency || 'USD');
  const [homeCurrency, setHomeCurrency] = useState(trip.homeCurrency || '');
  const [countryCode, setCountryCode] = useState(trip.countryCode || '');
  const [themeColor, setThemeColor] = useState(trip.days?.[0]?.themeColor || '#3B82F6');
  const [emergencyContacts, setEmergencyContacts] = useState(trip.emergencyContacts || '');
  const [generalNotes, setGeneralNotes] = useState(trip.generalNotes || '');
  const [travelers, setTravelers] = useState<string[]>(
    trip.travelers && trip.travelers.length > 0 ? trip.travelers : ['John', 'Jane']
  );
  const [newTravelerName, setNewTravelerName] = useState('');

  const [isSaved, setIsSaved] = useState(false);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);

  useEffect(() => {
    setTitle(trip.title);
    setDestination(trip.destination);
    setStartDate(trip.startDate || '');
    setEndDate(trip.endDate || '');
    setStartTime(trip.startTime || '09:00');
    setEndTime(trip.endTime || '21:00');
    setBaseCurrency(trip.baseCurrency || 'USD');
    setHomeCurrency(trip.homeCurrency || '');
    setCountryCode(trip.countryCode || '');
    setThemeColor(trip.days?.[0]?.themeColor || '#3B82F6');
    setEmergencyContacts(trip.emergencyContacts || '');
    setGeneralNotes(trip.generalNotes || '');
    setTravelers(trip.travelers && trip.travelers.length > 0 ? trip.travelers : ['John', 'Jane']);
  }, [trip.id]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (isSaved) {
      timer = setTimeout(() => setIsSaved(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [isSaved]);

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const formattedDates =
      startDate && endDate ? `${startDate} – ${endDate}` : trip.dates;

    const updatedDays = (trip.days || []).map((day) => ({
      ...day,
      themeColor,
    }));

    onUpdateTrip({
      title: title.trim() || trip.title,
      destination: destination.trim() || trip.destination,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      dates: formattedDates,
      baseCurrency,
      homeCurrency: homeCurrency.trim().toUpperCase() || undefined,
      countryCode: countryCode.trim().toUpperCase() || undefined,
      emergencyContacts: emergencyContacts.trim() || undefined,
      generalNotes: generalNotes.trim() || undefined,
      travelers: travelers.map((t) => t.trim()).filter((t) => t.length > 0),
      days: updatedDays,
    });

    setIsSaved(true);
  };

  return (
    <div className="settings-page-root">
      {/* Global Unified Header */}
      <Header
        currentView="trip_settings"
        title={trip.title}
        destination={trip.destination}
        activeSession={activeSession ?? null}
        onOpenAuth={onOpenAuth ?? (() => {})}
        onLogout={onLogout}
        onBackToWorkspace={onBackToWorkspace}
        extraActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="secondary-action-btn"
              onClick={() => window.print()}
              title="Print formatted emergency travel packet"
            >
              <Printer size={14} />
              <span className="btn-label-responsive">Print Travel Packet</span>
            </button>
            <button
              type="button"
              className={`primary-action-btn ${isSaved ? 'bg-emerald' : ''}`}
              onClick={() => handleSave()}
            >
              {isSaved ? <Check size={14} /> : <Save size={14} />}
              <span>{isSaved ? 'Changes Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        }
      />

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
                  <MapPin size={12} className="inline mr-1" />
                  Country Code <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(e.g. US, AE, MY)</span>
                </label>
                <input
                  type="text"
                  className="form-input"
                  maxLength={2}
                  placeholder="e.g. AE"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value.toUpperCase())}
                  style={{ textTransform: 'uppercase' }}
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

              <div>
                <label className="form-label">
                  <DollarSign size={12} className="inline mr-1" />
                  Home Currency <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(for live conversion)</span>
                </label>
                <select
                  className="form-input"
                  value={homeCurrency}
                  onChange={(e) => setHomeCurrency(e.target.value)}
                >
                  <option value="">— none —</option>
                  {CURRENCIES.map((cur) => (
                    <option key={cur} value={cur}>{cur}</option>
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
                    aria-label={`Theme color ${c.name}`}
                  >
                    {themeColor === c.hex && <Check size={13} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Section: Travelers & Companions */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-node">
              <Users size={17} className="text-blue" />
            </div>
            <div>
              <h2 className="settings-section-title">Travelers &amp; Companions</h2>
              <p className="settings-section-subtitle">
                Manage traveler names used across flight tickets, hotel vouchers, and outfits
              </p>
            </div>
          </div>

          <div className="settings-fields-stack">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {travelers.map((name, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={name}
                    placeholder={`Traveler ${idx + 1}`}
                    onChange={(e) => {
                      const updated = [...travelers];
                      updated[idx] = e.target.value;
                      setTravelers(updated);
                    }}
                  />
                  {travelers.length > 1 && (
                    <button
                      type="button"
                      className="pass-delete-btn"
                      onClick={() => {
                        setTravelers(travelers.filter((_, i) => i !== idx));
                      }}
                      title="Remove traveler"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Add companion name (e.g. John, Jane)..."
                value={newTravelerName}
                onChange={(e) => setNewTravelerName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newTravelerName.trim()) {
                      setTravelers([...travelers, newTravelerName.trim()]);
                      setNewTravelerName('');
                    }
                  }
                }}
              />
              <button
                type="button"
                className="secondary-action-btn"
                style={{ whiteSpace: 'nowrap' }}
                onClick={() => {
                  if (newTravelerName.trim()) {
                    setTravelers([...travelers, newTravelerName.trim()]);
                    setNewTravelerName('');
                  }
                }}
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
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

        {/* Section 3: Personal Vault & Security */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-node">
              <Lock size={17} className="text-blue" />
            </div>
            <div>
              <h2 className="settings-section-title">Personal Vault &amp; Session Security</h2>
              <p className="settings-section-subtitle">
                Manage your authenticated session and secure your personal itineraries
              </p>
            </div>
          </div>

          <div className="settings-fields-stack">
            <div className="share-privacy-notice">
              <ShieldCheck size={16} className="text-emerald flex-shrink-0" />
              <span>
                <strong>Personal Vault Active:</strong> Your trips sync directly to your personal database. When finished, lock your vault to require your password on your next visit.
              </span>
            </div>

            {onLogout && (
              <div className="form-group pt-2">
                <button
                  type="button"
                  className="secondary-action-btn text-rose flex items-center justify-center gap-2 w-full py-2.5"
                  onClick={onLogout}
                >
                  <LogOut size={15} />
                  <span>Lock Vault & Log Out</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Scratchpad & Emergency Travel Notes */}
        <div className="settings-card">
          <div className="settings-card-header">
            <div className="settings-icon-node">
              <PhoneCall size={17} className="text-amber" />
            </div>
            <div>
              <h2 className="settings-section-title">Emergency Contacts &amp; Trip Scratchpad</h2>
              <p className="settings-section-subtitle">
                Embassy phone numbers, local emergency services, wifi credentials, and offline notes
              </p>
            </div>
          </div>

          <div className="settings-fields-stack">
            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <PhoneCall size={12} className="text-amber" />
                <span>Emergency Contacts &amp; Embassy Details</span>
              </label>
              <textarea
                className="form-input text-xs font-mono"
                rows={3}
                placeholder="e.g. Police: 999, Ambulance: 998, US Consulate: +971-4-309-4000"
                value={emergencyContacts}
                onChange={(e) => setEmergencyContacts(e.target.value)}
              />
              <span className="text-xs text-secondary mt-1 block">
                Included on the formatted printable travel packet and offline emergency summary.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label flex items-center gap-1.5">
                <FileText size={12} className="text-blue" />
                <span>General Travel Notes, Access Codes &amp; Wifi</span>
              </label>
              <textarea
                className="form-input text-xs font-mono"
                rows={3}
                placeholder="e.g. Hotel Wifi: BurjGuest / Code: Burj2026, Lockbox code: 4892"
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Section 5: Data Management & Danger Zone */}
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

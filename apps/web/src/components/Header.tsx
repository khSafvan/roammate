import React from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Compass,
  FileText,
  Key,
  Lock,
  LogOut,
  Plus,
  Receipt,
  Settings,
  Share2,
  Shirt,
  Ticket,
} from 'lucide-react';
import { VaultSession } from '../auth/crypto';

export interface HeaderProps {
  title?: string;
  destination?: string;
  dates?: string;
  startTime?: string;
  endTime?: string;
  readinessScore?: number;
  activeSession: VaultSession | null;
  tripsCount?: number;
  currentView?: 'trips_list' | 'trip_detail' | 'trip_settings';
  activeTab?: 'timeline' | 'bookings' | 'expenses' | 'outfits';
  flightsCount?: number;
  expensesCount?: number;
  looksCount?: number;
  onSelectTab?: (tab: 'timeline' | 'bookings' | 'expenses' | 'outfits') => void;
  onNavigateView?: (view: 'trips_list' | 'trip_detail' | 'trip_settings') => void;
  onOpenTripManager?: () => void;
  onOpenReadiness?: () => void;
  onOpenAuth: () => void;
  onShare?: () => void;
  onOpenScratchpad?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
  // Specific view actions:
  onOpenCreateTrip?: () => void;
  onBackToWorkspace?: () => void;
  extraActions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = '',
  destination = '',
  dates = '',
  startTime,
  endTime,
  readinessScore = 0,
  activeSession,
  tripsCount = 1,
  currentView = 'trip_detail',
  activeTab = 'timeline',
  flightsCount = 0,
  expensesCount = 0,
  looksCount = 0,
  onSelectTab,
  onNavigateView,
  onOpenTripManager,
  onOpenReadiness,
  onOpenAuth,
  onShare,
  onOpenScratchpad,
  onOpenSettings,
  onLogout,
  onOpenCreateTrip,
  onBackToWorkspace,
  extraActions,
}) => {
  return (
    <header className="header-root">
      <div className="header-container">
        {/* Left: Branding, All Trips & Unified Trip Switcher */}
        <div className="header-left">
          {currentView === 'trip_settings' ? (
            <>
              {onBackToWorkspace && (
                <button
                  type="button"
                  className="breadcrumb-back-btn"
                  onClick={onBackToWorkspace}
                  title="Return to Itinerary Workspace"
                >
                  <ArrowLeft size={16} />
                  <span>Back to Itinerary</span>
                </button>
              )}
              <div className="header-meta">
                <h1 className="trip-title" style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>
                  Trip Settings · {title}
                </h1>
                {destination && <span className="text-xs text-secondary">{destination}</span>}
              </div>
            </>
          ) : currentView === 'trips_list' ? (
            <>
              <div className="header-brand">
                <div className="brand-logo-btn" style={{ cursor: 'default' }}>
                  <img className="brand-logo" src="/icon.svg" alt="" />
                  <span className="brand-name">MojoLog</span>
                </div>
              </div>
              <div className="trips-hub-tag">
                <Compass size={13} className="text-blue" />
                <span>Travel Vault</span>
              </div>
            </>
          ) : (
            <>
              <div className="header-brand">
                <button
                  type="button"
                  className="brand-logo-btn"
                  onClick={() => onNavigateView && onNavigateView('trips_list')}
                  title="Return to All Trips"
                  aria-label="MojoLog – Return to All Trips"
                >
                  <img className="brand-logo" src="/icon.svg" alt="" />
                  <span className="brand-name">MojoLog</span>
                </button>
              </div>

              <div className="header-divider" />

              <div className="header-meta">
                <button
                  type="button"
                  className="trip-switcher-trigger-btn"
                  onClick={onOpenTripManager}
                  title="Switch trips or create a new itinerary"
                  aria-label={`Switch trip: ${title}`}
                  aria-haspopup="dialog"
                >
                  <div className="trip-switcher-text">
                    <div className="trip-title-row">
                      <span className="trip-title">{title}</span>
                      <ChevronDown size={14} className="trip-dropdown-icon" />
                    </div>
                    <div className="trip-submeta">
                      <span>{destination}</span>
                      <span className="meta-dot">•</span>
                      <span>{dates}</span>
                      {startTime && endTime && (
                        <>
                          <span className="meta-dot">•</span>
                          <span>{startTime}–{endTime}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="trips-count-badge">{tripsCount}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Center: View Switcher Tabs (Itinerary, Bookings/Passes, Expenses) */}
        {onSelectTab && currentView === 'trip_detail' && (
          <div className="header-center">
            <nav className="header-nav-tabs" role="tablist" aria-label="Trip Views">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'timeline'}
                className={`header-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => onSelectTab('timeline')}
              >
                <CalendarDays size={14} />
                <span>Itinerary</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'bookings'}
                className={`header-tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
                onClick={() => onSelectTab('bookings')}
              >
                <Ticket size={14} />
                <span>Bookings</span>
                {flightsCount > 0 && (
                  <span className="nav-counter-pill">{flightsCount}</span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'expenses'}
                className={`header-tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
                onClick={() => onSelectTab('expenses')}
              >
                <Receipt size={14} />
                <span>Expenses</span>
                {expensesCount > 0 && (
                  <span className="nav-counter-pill">{expensesCount}</span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'outfits'}
                className={`header-tab-btn ${activeTab === 'outfits' ? 'active' : ''}`}
                onClick={() => onSelectTab('outfits')}
              >
                <Shirt size={14} />
                <span>Outfits &amp; Packing</span>
                {looksCount > 0 && (
                  <span className="nav-counter-pill">{looksCount}</span>
                )}
              </button>
            </nav>
          </div>
        )}

        {/* Right: Actions */}
        <div className="header-actions">
          {currentView === 'trips_list' ? (
            <>
              <button
                className={`vault-auth-btn ${activeSession ? 'authenticated' : ''}`}
                onClick={onOpenAuth}
                title={activeSession ? 'Personal Vault Active' : 'Unlock Personal Vault'}
              >
                {activeSession ? (
                  <>
                    <Lock size={13} strokeWidth={1.75} className="text-emerald" />
                    <span className="vault-btn-text">Personal Vault</span>
                  </>
                ) : (
                  <>
                    <Key size={13} strokeWidth={1.75} className="text-amber" />
                    <span className="vault-btn-text">Unlock Vault</span>
                  </>
                )}
              </button>

              {activeSession && onLogout && (
                <button
                  className="secondary-action-btn text-rose"
                  onClick={onLogout}
                  title="Lock Vault & Log Out"
                >
                  <LogOut size={13} />
                  <span>Lock</span>
                </button>
              )}

              {onOpenCreateTrip && (
                <button
                  className="primary-action-btn"
                  onClick={onOpenCreateTrip}
                  title="Plan a new journey"
                >
                  <Plus size={15} />
                  <span>Plan New Trip</span>
                </button>
              )}
            </>
          ) : currentView === 'trip_settings' ? (
            <>
              <button
                className={`vault-auth-btn ${activeSession ? 'authenticated' : ''}`}
                onClick={onOpenAuth}
                title={activeSession ? 'Personal Vault Connected' : 'Unlock Personal Vault'}
              >
                {activeSession ? (
                  <>
                    <Lock size={12} strokeWidth={2} className="text-emerald" />
                    <span className="vault-btn-text btn-label-responsive">Vault Active</span>
                  </>
                ) : (
                  <>
                    <Key size={12} strokeWidth={2} className="text-amber" />
                    <span className="vault-btn-text btn-label-responsive">Unlock</span>
                  </>
                )}
              </button>

              {activeSession && onLogout && (
                <button
                  type="button"
                  className="header-action-pill text-rose"
                  onClick={onLogout}
                  title="Lock Vault & Log Out"
                  aria-label="Lock Vault and Log Out"
                >
                  <LogOut size={13} strokeWidth={1.75} />
                  <span className="btn-label-responsive">Lock</span>
                </button>
              )}

              {extraActions}
            </>
          ) : (
            <>
              {onOpenScratchpad && (
                <button
                  type="button"
                  className="header-action-pill"
                  onClick={onOpenScratchpad}
                  title="Trip Scratchpad, Emergency Contacts & Day Notes"
                >
                  <FileText size={13} strokeWidth={1.75} />
                  <span className="btn-label-responsive">Notes</span>
                </button>
              )}

              {onShare && (
                <button
                  type="button"
                  className="header-action-pill"
                  onClick={onShare}
                  title="Export Itinerary or Print Travel Packet"
                >
                  <Share2 size={13} strokeWidth={1.75} />
                  <span className="btn-label-responsive">Export</span>
                </button>
              )}

              {/* Personal Vault Button */}
              <button
                className={`vault-auth-btn ${activeSession ? 'authenticated' : ''}`}
                onClick={onOpenAuth}
                title={activeSession ? 'Personal Vault Connected' : 'Unlock Personal Vault'}
              >
                {activeSession ? (
                  <>
                    <Lock size={12} strokeWidth={2} className="text-emerald" />
                    <span className="vault-btn-text btn-label-responsive">Vault Active</span>
                  </>
                ) : (
                  <>
                    <Key size={12} strokeWidth={2} className="text-amber" />
                    <span className="vault-btn-text btn-label-responsive">Unlock</span>
                  </>
                )}
              </button>

              {/* Explicit Lock / Logout Button when authenticated */}
              {activeSession && onLogout && (
                <button
                  type="button"
                  className="header-action-pill text-rose"
                  onClick={onLogout}
                  title="Lock Vault & Log Out"
                  aria-label="Lock Vault and Log Out"
                >
                  <LogOut size={13} strokeWidth={1.75} />
                  <span className="btn-label-responsive">Lock</span>
                </button>
              )}

              {onOpenReadiness && (
                <button
                  type="button"
                  className="readiness-btn"
                  onClick={onOpenReadiness}
                  title="View Trip Readiness Checklist"
                  aria-label={`Trip readiness: ${readinessScore}% ready`}
                >
                  <CheckCircle2 size={14} strokeWidth={2} className="text-emerald" />
                  <span className="readiness-val tabular">{readinessScore}%</span>
                  <span className="readiness-label btn-label-responsive">Ready</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  type="button"
                  className="icon-btn"
                  onClick={onOpenSettings}
                  title="Edit Trip Settings & Preferences"
                  aria-label="Edit Trip Settings and Preferences"
                >
                  <Settings size={15} strokeWidth={1.75} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

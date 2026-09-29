import React from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileText,
  Key,
  Lock,
  LogOut,
  Receipt,
  Settings,
  Share2,
  Ticket,
} from 'lucide-react';
import { VaultSession } from '../auth/crypto';

interface HeaderProps {
  title: string;
  destination: string;
  dates: string;
  startTime?: string;
  endTime?: string;
  readinessScore: number;
  activeSession: VaultSession | null;
  tripsCount?: number;
  currentView?: 'trips_list' | 'trip_detail' | 'trip_settings';
  activeTab?: 'timeline' | 'flights' | 'expenses';
  flightsCount?: number;
  expensesCount?: number;
  onSelectTab?: (tab: 'timeline' | 'flights' | 'expenses') => void;
  onNavigateView?: (view: 'trips_list' | 'trip_detail' | 'trip_settings') => void;
  onOpenTripManager?: () => void;
  onOpenReadiness: () => void;
  onOpenAuth: () => void;
  onShare: () => void;
  onOpenScratchpad?: () => void;
  onOpenSettings?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  destination,
  dates,
  startTime,
  endTime,
  readinessScore,
  activeSession,
  tripsCount = 1,
  currentView,
  activeTab = 'timeline',
  flightsCount = 0,
  expensesCount = 0,
  onSelectTab,
  onNavigateView,
  onOpenTripManager,
  onOpenReadiness,
  onOpenAuth,
  onShare,
  onOpenScratchpad,
  onOpenSettings,
  onLogout,
}) => {
  return (
    <header className="header-root">
      <div className="header-container">
        {/* Left: Branding, All Trips & Unified Trip Switcher */}
        <div className="header-left">
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

          {currentView !== 'trips_list' && (
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
          )}
        </div>

        {/* Center: View Switcher Tabs (Itinerary, Bookings/Passes, Expenses) */}
        {onSelectTab && currentView !== 'trips_list' && (
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
                aria-selected={activeTab === 'flights'}
                className={`header-tab-btn ${activeTab === 'flights' ? 'active' : ''}`}
                onClick={() => onSelectTab('flights')}
              >
                <Ticket size={14} />
                <span>Bookings &amp; Tickets</span>
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
            </nav>
          </div>
        )}

        {/* Right: Notes, Share, Vault Auth, Readiness Score & Settings */}
        <div className="header-actions">
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

          <button
            type="button"
            className="header-action-pill"
            onClick={onShare}
            title="Export Itinerary or Print Travel Packet"
          >
            <Share2 size={13} strokeWidth={1.75} />
            <span className="btn-label-responsive">Export</span>
          </button>

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
        </div>
      </div>
    </header>
  );
};

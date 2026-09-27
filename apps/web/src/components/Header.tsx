import React from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  FileText,
  Key,
  Lock,
  Plane,
  Receipt,
  Settings,
  Share2,
} from 'lucide-react';
import { formatAccountId, VaultSession } from '../auth/crypto';

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
            >
              <img className="brand-logo" src="/icon.svg" alt="" />
              <span className="brand-name">roammate</span>
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
            <nav className="header-nav-tabs" aria-label="Trip Views">
              <button
                type="button"
                className={`header-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
                onClick={() => onSelectTab('timeline')}
              >
                <CalendarDays size={14} />
                <span>Itinerary</span>
              </button>

              <button
                type="button"
                className={`header-tab-btn ${activeTab === 'flights' ? 'active' : ''}`}
                onClick={() => onSelectTab('flights')}
              >
                <Plane size={14} />
                <span>Tickets &amp; Passes</span>
                {flightsCount > 0 && (
                  <span className="nav-counter-pill">{flightsCount}</span>
                )}
              </button>

              <button
                type="button"
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
            title="Invite Companion via Private Link or Export Itinerary"
          >
            <Share2 size={13} strokeWidth={1.75} />
            <span className="btn-label-responsive">Share</span>
          </button>

          {/* Cryptographic Vault Button */}
          <button
            className={`vault-auth-btn ${activeSession ? 'authenticated' : ''}`}
            onClick={onOpenAuth}
            title={activeSession ? 'Vault Authenticated via UUID' : 'Unlock or Create Private Travel Vault'}
          >
            {activeSession ? (
              <>
                <Lock size={12} strokeWidth={2} className="text-emerald" />
                <span className="vault-btn-text btn-label-responsive">{formatAccountId(activeSession.userId)}</span>
              </>
            ) : (
              <>
                <Key size={12} strokeWidth={2} className="text-amber" />
                <span className="vault-btn-text btn-label-responsive">Connect</span>
              </>
            )}
          </button>

          <button
            className="readiness-btn"
            onClick={onOpenReadiness}
            title="View Trip Readiness Checklist"
          >
            <CheckCircle2 size={14} strokeWidth={2} className="text-emerald" />
            <span className="readiness-val tabular">{readinessScore}%</span>
            <span className="readiness-label btn-label-responsive">Ready</span>
          </button>

          {onOpenSettings && (
            <button
              className="icon-btn"
              onClick={onOpenSettings}
              title="Edit Trip Settings & Preferences"
            >
              <Settings size={15} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

import React from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Compass,
  Cpu,
  Key,
  Lock,
  MapPin,
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
  isWasmActive: boolean;
  activeSession: VaultSession | null;
  tripsCount?: number;
  onOpenTripManager?: () => void;
  onOpenReadiness: () => void;
  onOpenAuth: () => void;
  onShare: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  destination,
  dates,
  startTime,
  endTime,
  readinessScore,
  isWasmActive,
  activeSession,
  tripsCount = 1,
  onOpenTripManager,
  onOpenReadiness,
  onOpenAuth,
  onShare,
}) => {
  return (
    <header className="header-root">
      <div className="header-container">
        {/* Left: Branding & Trip Meta */}
        <div className="header-left">
          <div className="header-brand">
            <span className="brand-logo">✈️</span>
            <span className="brand-name">MojoLog</span>
            {isWasmActive && (
              <span className="wasm-badge" title="Core math & route optimization running on WebAssembly compiled from Rust">
                <Cpu size={12} strokeWidth={1.75} />
                <span>Rust WASM</span>
              </span>
            )}
          </div>
          <div className="header-meta">
            <div className="trip-title-row">
              <button
                type="button"
                className="trip-switcher-trigger-btn"
                onClick={onOpenTripManager}
                title="Switch trips or create a new itinerary"
              >
                <h1 className="trip-title">{title}</h1>
                <ChevronDown size={16} className="text-slate ml-1" />
                <span className="trips-count-badge">{tripsCount} trips</span>
              </button>
            </div>
            <div className="trip-submeta">
              <span className="meta-pill">
                <MapPin size={13} strokeWidth={1.75} />
                <span>{destination}</span>
              </span>
              <span className="meta-dot">•</span>
              <span className="meta-pill">
                <Calendar size={13} strokeWidth={1.75} />
                <span>{dates}</span>
              </span>
              {startTime && endTime && (
                <>
                  <span className="meta-dot">•</span>
                  <span className="meta-pill">
                    <Clock size={13} strokeWidth={1.75} />
                    <span>
                      {startTime} – {endTime}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Vault Auth, Readiness Score & Action Buttons */}
        <div className="header-actions">
          {/* Trip Manager Pill */}
          {onOpenTripManager && (
            <button
              className="trip-manager-quick-btn"
              onClick={onOpenTripManager}
              title="Manage & Switch Trips"
            >
              <Compass size={14} strokeWidth={1.75} />
              <span>Trips</span>
            </button>
          )}
          {/* Cryptographic Vault Button - Calm Utility */}
          <button
            className={`vault-auth-btn ${activeSession ? 'authenticated' : ''}`}
            onClick={onOpenAuth}
            title={activeSession ? 'Vault Authenticated via UUID' : 'Unlock or Create Private Travel Vault'}
          >
            {activeSession ? (
              <>
                <Lock size={13} strokeWidth={1.75} className="text-emerald" />
                <span className="vault-btn-text">{formatAccountId(activeSession.userId)}</span>
              </>
            ) : (
              <>
                <Key size={13} strokeWidth={1.75} className="text-amber" />
                <span className="vault-btn-text">Connect Vault</span>
              </>
            )}
          </button>

          <button
            className="readiness-btn"
            onClick={onOpenReadiness}
            title="View Trip Readiness Checklist"
          >
            <div className="readiness-badge">
              <CheckCircle2 size={15} strokeWidth={1.75} className="text-emerald" />
              <span className="readiness-val tabular">{readinessScore}%</span>
            </div>
            <span className="readiness-label">Readiness</span>
          </button>

          <button className="icon-btn" onClick={onShare} title="Share One-Link Itinerary">
            <Share2 size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </header>
  );
};

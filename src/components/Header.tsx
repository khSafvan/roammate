import React from 'react';
import { Calendar, CheckCircle2, Cpu, MapPin, Share2 } from 'lucide-react';

interface HeaderProps {
  title: string;
  destination: string;
  dates: string;
  readinessScore: number;
  isWasmActive: boolean;
  onOpenReadiness: () => void;
  onShare: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  destination,
  dates,
  readinessScore,
  isWasmActive,
  onOpenReadiness,
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
                <Cpu size={12} />
                <span>Rust WASM</span>
              </span>
            )}
          </div>
          <div className="header-meta">
            <h1 className="trip-title">{title}</h1>
            <div className="trip-submeta">
              <span className="meta-pill">
                <MapPin size={13} />
                <span>{destination}</span>
              </span>
              <span className="meta-dot">•</span>
              <span className="meta-pill">
                <Calendar size={13} />
                <span>{dates}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right: Readiness Score & Action Buttons */}
        <div className="header-actions">
          <button
            className="readiness-btn"
            onClick={onOpenReadiness}
            title="View Trip Readiness Checklist"
          >
            <div className="readiness-badge">
              <CheckCircle2 size={16} className="text-emerald" />
              <span className="readiness-val">{readinessScore}%</span>
            </div>
            <span className="readiness-label">Readiness</span>
          </button>

          <button className="icon-btn" onClick={onShare} title="Share One-Link Itinerary">
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

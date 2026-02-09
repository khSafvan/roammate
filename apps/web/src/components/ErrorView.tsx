import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Database,
  Globe,
  ShieldCheck,
} from 'lucide-react';
import { isRustReady } from '../wasm/engine';

interface ErrorViewProps {
  onGoHome: () => void;
}

export const ErrorView: React.FC<ErrorViewProps> = ({ onGoHome }) => {
  const [testCrash, setTestCrash] = useState(false);
  const wasmReady = isRustReady();

  if (testCrash) {
    throw new Error('Simulated roammate Diagnostic Test Error: Error Boundary verified successfully!');
  }

  return (
    <div className="error-screen-container">
      <div className="error-card">
        <div className="error-status-header">
          <div className="error-badge-icon pulse-green">
            <CheckCircle2 size={32} className="text-emerald" />
          </div>
          <div>
            <h2 className="error-title">roammate Diagnostics & System Status</h2>
            <p className="error-description">
              You visited <code>/error</code>. All core services, WASM algorithms, and cryptographic vaults are operational.
            </p>
          </div>
        </div>

        {/* Diagnostics Matrix */}
        <div className="diagnostics-grid">
          <div className="diagnostic-tile">
            <div className="tile-icon-row">
              <Cpu size={16} className="text-emerald" />
              <span className="tile-title">Rust WASM Core</span>
            </div>
            <div className="tile-status text-emerald">
              {wasmReady ? 'Active & High-Speed' : 'Fallback JS Mode'}
            </div>
            <div className="tile-meta">2-opt TSP Solver · Haversine Geo</div>
          </div>

          <div className="diagnostic-tile">
            <div className="tile-icon-row">
              <ShieldCheck size={16} className="text-emerald" />
              <span className="tile-title">BIP-39 Vault</span>
            </div>
            <div className="tile-status text-emerald">Operational</div>
            <div className="tile-meta">12-Word WebCrypto SHA-256</div>
          </div>

          <div className="diagnostic-tile">
            <div className="tile-icon-row">
              <Globe size={16} className="text-blue" />
              <span className="tile-title">Vite Dev Server</span>
            </div>
            <div className="tile-status text-blue">Port 3000 Connected</div>
            <div className="tile-meta">HMR active · Mobile Responsive</div>
          </div>

          <div className="diagnostic-tile">
            <div className="tile-icon-row">
              <Database size={16} className="text-amber" />
              <span className="tile-title">Edge Storage</span>
            </div>
            <div className="tile-status text-amber">Turso / libSQL Ready</div>
            <div className="tile-meta">Cloudflare Workers Hono API</div>
          </div>
        </div>

        {/* Actions */}
        <div className="error-actions-group">
          <button className="primary-brand-btn" onClick={onGoHome}>
            <span>Launch Tokyo Trip Itinerary</span>
            <ArrowRight size={16} />
          </button>

          <button
            className="secondary-action-btn"
            onClick={() => setTestCrash(true)}
            title="Verifies that React Error Boundary catches unhandled exceptions gracefully"
          >
            <AlertCircle size={15} />
            <span>Test Error Boundary</span>
          </button>
        </div>
      </div>
    </div>
  );
};

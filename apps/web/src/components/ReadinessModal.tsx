import React from 'react';
import { Check, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { ReadinessItem } from '../types/trip';

interface ReadinessModalProps {
  isOpen: boolean;
  score: number;
  items: ReadinessItem[];
  onToggleItem: (id: string) => void;
  onClose: () => void;
}

export const ReadinessModal: React.FC<ReadinessModalProps> = ({
  isOpen,
  score,
  items,
  onToggleItem,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Trip Readiness Hub</h2>
            <p className="modal-subtitle">
              TripMojo checklist: essential prerequisites before you fly
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Score Progress */}
        <div className="readiness-summary-card">
          <div className="summary-score-row">
            <CheckCircle2 size={24} className="text-emerald" />
            <span className="summary-score-text">{score}% Prepared</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="checklist-items">
          {items.map((item) => (
            <div
              key={item.id}
              className={`checklist-row ${item.completed ? 'completed' : ''}`}
              onClick={() => onToggleItem(item.id)}
            >
              <div className={`checkbox-box ${item.completed ? 'checked' : ''}`}>
                {item.completed && <Check size={13} />}
              </div>
              <span className="checkbox-label">{item.label}</span>
              {item.critical && !item.completed && (
                <span className="critical-pill">
                  <ShieldAlert size={12} />
                  <span>Required</span>
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="primary-modal-btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

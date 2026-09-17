import React from 'react';
import {
  Calendar,
  Clock,
  ExternalLink,
  FileText,
  MapPin,
  Navigation,
  QrCode,
  X,
} from 'lucide-react';
import { ItineraryStop } from '../types/trip';

interface StopDetailModalProps {
  stop: ItineraryStop | null;
  themeColor: string;
  onClose: () => void;
}

export const StopDetailModal: React.FC<StopDetailModalProps> = ({
  stop,
  themeColor,
  onClose,
}) => {
  if (!stop) return null;

  const handleOpenGoogleMaps = () => {
    const q = encodeURIComponent(`${stop.title}, ${stop.address}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${q}`, '_blank');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div
              className="stop-badge-lg"
              style={{ backgroundColor: themeColor }}
            >
              {stop.orderIndex}
            </div>
            <div>
              <h2 className="modal-title">{stop.title}</h2>
              <p className="modal-subtitle">{stop.subtitle}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Time & Duration row */}
        <div className="detail-meta-pills">
          <div className="detail-pill">
            <Clock size={14} className="text-blue" />
            <span>{stop.startTime}</span>
          </div>
          <div className="detail-pill">
            <Calendar size={14} />
            <span>{stop.durationMinutes} mins scheduled</span>
          </div>
        </div>

        {/* Location & Navigation */}
        <div className="detail-section">
          <div className="section-title-line">
            <MapPin size={14} />
            <span>Location</span>
          </div>
          <p className="detail-address-text">{stop.address}</p>
          <button className="maps-nav-btn" onClick={handleOpenGoogleMaps}>
            <Navigation size={14} />
            <span>Open in Google Maps</span>
            <ExternalLink size={12} />
          </button>
        </div>

        {/* Booking & Ticket Vault */}
        {stop.bookingRef && (
          <div className="detail-section">
            <div className="section-title-line">
              <QrCode size={14} className="text-emerald" />
              <span>Verified Reservation</span>
            </div>
            <div className="booking-ref-box">
              <span className="booking-ref-label">Confirmation Code:</span>
              <span className="booking-ref-code">{stop.bookingRef}</span>
            </div>
          </div>
        )}

        {/* Notes */}
        {stop.notes && (
          <div className="detail-section">
            <div className="section-title-line">
              <FileText size={14} className="text-amber" />
              <span>Traveler Note</span>
            </div>
            <p className="detail-note-text">{stop.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="modal-footer">
          <button className="primary-modal-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

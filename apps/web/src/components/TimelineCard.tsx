import React from 'react';
import {
  BedDouble,
  Clock,
  Compass,
  FileCheck2,
  Landmark,
  MapPin,
  Plane,
  UtensilsCrossed,
} from 'lucide-react';
import { ItineraryStop, StopCategory } from '../types/trip';

interface TimelineCardProps {
  stop: ItineraryStop;
  themeColor: string;
  onSelect: (stop: ItineraryStop) => void;
}

const getCategoryIcon = (category: StopCategory) => {
  switch (category) {
    case 'flight':
      return <Plane size={15} strokeWidth={1.75} />;
    case 'lodging':
      return <BedDouble size={15} strokeWidth={1.75} />;
    case 'sight':
      return <Landmark size={15} strokeWidth={1.75} />;
    case 'dining':
      return <UtensilsCrossed size={15} strokeWidth={1.75} />;
    default:
      return <Compass size={15} strokeWidth={1.75} />;
  }
};

export const TimelineCard = React.memo<TimelineCardProps>(function TimelineCard({
  stop,
  onSelect,
}) {
  return (
    <div className="timeline-item-wrapper">
      {/* Category Node Anchored on the Sequential Axis */}
      <div className={`category-node node-${stop.category}`} title={stop.category.toUpperCase()}>
        {getCategoryIcon(stop.category)}
      </div>

      {/* Main Modular Card Container */}
      <div className="timeline-card" onClick={() => onSelect(stop)}>
        <div className="card-body">
          {/* Top Line: Sequence, Time, Duration & Ticket Pill */}
          <div className="card-meta-line">
            <span className="card-order-pill">
              #{String(stop.orderIndex).padStart(2, '0')}
            </span>
            <span className="card-time">{stop.startTime}</span>

            <span className="card-category-sublabel">
              {stop.category}
            </span>

            {stop.durationMinutes > 0 && (
              <span className="card-duration-pill">
                <Clock size={10} strokeWidth={1.75} />
                <span>{stop.durationMinutes}m</span>
              </span>
            )}

            {stop.hasTicket && (
              <span className="card-ticket-pill">
                <FileCheck2 size={11} strokeWidth={1.75} />
                <span>Ticket Ready</span>
              </span>
            )}
          </div>

          {/* Primary Label / Title & Subtitle */}
          <h3 className="card-title">{stop.title}</h3>
          {stop.subtitle && <p className="card-subtitle">{stop.subtitle}</p>}

          {/* Secondary Footer Metadata */}
          <div className="card-footer-line">
            <div className="card-address">
              <MapPin size={12} strokeWidth={1.75} />
              <span>{(stop.address || '').split(',')[0] || 'Location pending'}</span>
            </div>

            {stop.bookingRef && (
              <span className="card-ref-badge">REF: {stop.bookingRef}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

import React from 'react';
import {
  BedDouble,
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
      return <Plane size={13} />;
    case 'lodging':
      return <BedDouble size={13} />;
    case 'sight':
      return <Landmark size={13} />;
    case 'dining':
      return <UtensilsCrossed size={13} />;
    default:
      return <Compass size={13} />;
  }
};

export const TimelineCard = React.memo<TimelineCardProps>(function TimelineCard({
  stop,
  themeColor,
  onSelect,
}) {
  return (
    <div className="timeline-card" onClick={() => onSelect(stop)}>
      <div className="card-inner">
        {/* Left Numerical Index Badge (Day Color Coded) */}
        <div className="stop-badge" style={{ backgroundColor: themeColor }}>
          {stop.orderIndex}
        </div>

        {/* Card Content Stack */}
        <div className="card-body">
          {/* Top Line: Time & Category */}
          <div className="card-meta-line">
            <span className="card-time">{stop.startTime}</span>
            <span className="card-category-tag">
              {getCategoryIcon(stop.category)}
              <span>{stop.category.toUpperCase()}</span>
            </span>

            {stop.hasTicket && (
              <span className="card-ticket-tag">
                <FileCheck2 size={12} />
                <span>Ticket</span>
              </span>
            )}
          </div>

          {/* Title & Subtitle */}
          <h3 className="card-title">{stop.title}</h3>
          <p className="card-subtitle">{stop.subtitle}</p>

          {/* Footer Metadata */}
          <div className="card-footer-line">
            <div className="card-address">
              <MapPin size={12} />
              <span>{stop.address.split(',')[0]}</span>
            </div>

            {stop.bookingRef && (
              <span className="card-ref-badge">Ref: {stop.bookingRef}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

import React from 'react';
import {
  Globe,
  Plane,
  Tag,
  Ticket,
  User,
  Users,
} from 'lucide-react';
import { Flight } from '../types/trip';

interface TimelineFlightCardProps {
  flights: Flight[];
  themeColor: string;
  onViewFlightsTab: () => void;
}

export const TimelineFlightCard: React.FC<TimelineFlightCardProps> = ({
  flights,
  onViewFlightsTab,
}) => {
  if (!flights || flights.length === 0) return null;

  const isMultiCompanion = flights.length > 1;

  return (
    <div className="timeline-item-wrapper timeline-flight-item">
      {/* Card Content */}
      <div className="timeline-card timeline-flight-card">
        <div className="flight-card-content">
          <div className="category-node node-flight" title="FLIGHTS">
            <Plane size={16} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          </div>
          <div className="flight-card-main">
            <div className="flight-card-header">
          <div className="flight-header-left">
            <span className="flight-card-type-tag">
              {isMultiCompanion ? (
                <>
                  <Users size={12} style={{ flexShrink: 0 }} />
                  <span>Group Flight Arrivals · {flights.length} Travelers</span>
                </>
              ) : (
                <>
                  <Plane size={12} style={{ flexShrink: 0 }} />
                  <span>Inbound Flight Itinerary</span>
                </>
              )}
            </span>
            <h3 className="flight-card-title">
              {isMultiCompanion
                ? 'Multi-Origin Companion Arrivals'
                : `${flights[0].carrier} ${flights[0].flightNumber} Arrival`}
            </h3>
          </div>

          <button
            type="button"
            className="view-tickets-quick-btn"
            onClick={onViewFlightsTab}
            title="Open Flight Boarding Passes tab"
          >
            <Ticket size={13} />
            <span>All Boarding Passes</span>
          </button>
          </div>

          {/* Flight Legs List */}
          <div className="companion-flights-list">
          {flights.map((fl) => {
            return (
              <div key={fl.id} className="companion-flight-row">
                <div className="companion-meta-col">
                  {fl.passengerName && (
                    <span className="companion-passenger-pill">
                      <User size={11} className="text-blue" style={{ flexShrink: 0 }} />
                      <span>{fl.passengerName}</span>
                    </span>
                  )}
                  <span className="flight-carrier-tag">
                    {fl.carrier} <strong>{fl.flightNumber}</strong>
                  </span>
                  {(fl.originCountry || fl.originCity) && (
                    <span className="companion-origin-pill">
                      <Globe size={11} style={{ flexShrink: 0 }} />
                      <span>
                        From {fl.originCity ? `${fl.originCity}, ` : ''}
                        {fl.originCountry || fl.departure.city}
                      </span>
                    </span>
                  )}
                </div>

                <div className="companion-route-col">
                  <div className="route-endpoints">
                    <span className="dep-airport">
                      <strong>{fl.departure.airport}</strong> ({fl.departure.time})
                    </span>
                    <span className="route-arrow">→</span>
                    <span className="arr-airport">
                      <strong>{fl.arrival.airport}</strong> ({fl.arrival.time})
                    </span>
                  </div>

                  <div className="companion-sub-meta">
                    {fl.departure.terminal && (
                      <span className="meta-info-pill dep-term">Dep: {fl.departure.terminal}</span>
                    )}
                    {fl.arrival.terminal && (
                      <span className="meta-info-pill arr-term">Arr: {fl.arrival.terminal}</span>
                    )}
                    {fl.seat && <span className="meta-info-pill">Seat {fl.seat}</span>}
                    {fl.cabinClass && (
                      <span className="meta-info-pill">
                        <Tag size={10} style={{ flexShrink: 0 }} />
                        {fl.cabinClass}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

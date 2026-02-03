import React from 'react';
import {
  ExternalLink,
  Globe,
  Plane,
  Radio,
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
    <div className="timeline-flight-card-container">
      {/* Timeline Node Anchor on left */}
      <div className="timeline-axis-node">
        <div className="flight-node-badge">
          <Plane size={15} className="text-blue" />
        </div>
      </div>

      {/* Card Content */}
      <div className="timeline-flight-card">
        <div className="flight-card-header">
          <div className="flight-header-left">
            <span className="flight-card-type-tag">
              {isMultiCompanion ? (
                <>
                  <Users size={12} />
                  <span>Group Flight Arrivals · {flights.length} Travelers</span>
                </>
              ) : (
                <>
                  <Plane size={12} />
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
            const flightRadarUrl = `https://www.flightradar24.com/data/flights/${fl.flightNumber.toLowerCase()}`;

            return (
              <div key={fl.id} className="companion-flight-row">
                <div className="companion-meta-col">
                  {fl.passengerName && (
                    <span className="companion-passenger-pill">
                      <User size={11} className="text-blue" />
                      <span>{fl.passengerName}</span>
                    </span>
                  )}
                  <span className="flight-carrier-tag">
                    {fl.carrier} <strong>{fl.flightNumber}</strong>
                  </span>
                  {(fl.originCountry || fl.originCity) && (
                    <span className="companion-origin-pill">
                      <Globe size={10} />
                      <span>
                        {fl.originCity ? `${fl.originCity}, ` : ''}
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
                    {fl.seat && <span className="meta-info-pill">Seat {fl.seat}</span>}
                    {fl.cabinClass && (
                      <span className="meta-info-pill">
                        <Tag size={10} />
                        {fl.cabinClass}
                      </span>
                    )}
                    {fl.arrival.terminal && (
                      <span className="meta-info-pill">{fl.arrival.terminal}</span>
                    )}
                  </div>
                </div>

                <div className="companion-actions-col">
                  <a
                    href={flightRadarUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="radar-mini-link"
                    title="Live FlightRadar24 Tracker"
                  >
                    <Radio size={11} className="radar-pulse" />
                    <span>Live</span>
                    <ExternalLink size={10} />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

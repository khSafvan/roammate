import React from 'react';
import { Trip } from '../types/trip';

interface PrintTravelPacketProps {
  trip: Trip;
}

export const PrintTravelPacket: React.FC<PrintTravelPacketProps> = ({ trip }) => {
  const hotelDocs = (trip.documents || []).filter((d) => d.category === 'hotel');

  return (
    <div className="print-travel-packet" aria-hidden="true">
      {/* 1. Print Cover Header */}
      <div className="print-cover-header">
        <div className="print-app-badge">roammate · Emergency Travel Packet</div>
        <h1 className="print-trip-title">{trip.title}</h1>
        <p className="print-trip-meta">
          <strong>Destination:</strong> {trip.destination} &nbsp;|&nbsp;{' '}
          <strong>Dates:</strong> {trip.dates} &nbsp;|&nbsp;{' '}
          <strong>Currency:</strong> {trip.baseCurrency}
        </p>
      </div>

      {/* 2. Emergency Contacts & Embassy Details */}
      {trip.emergencyContacts && (
        <div className="print-section">
          <h2 className="print-section-title">Emergency Contacts &amp; Embassy Details</h2>
          <div className="print-callout-box">{trip.emergencyContacts}</div>
        </div>
      )}

      {/* 3. General Notes & Wifi Codes */}
      {trip.generalNotes && (
        <div className="print-section">
          <h2 className="print-section-title">General Travel Notes &amp; Access Codes</h2>
          <div className="print-callout-box">{trip.generalNotes}</div>
        </div>
      )}

      {/* 4. Flights & Transportation Schedule */}
      {trip.flights && trip.flights.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Flight &amp; Air Transit Schedule</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Carrier / Flight #</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Confirmation</th>
                <th>Passenger / Seat</th>
              </tr>
            </thead>
            <tbody>
              {trip.flights.map((f) => (
                <tr key={f.id}>
                  <td>{f.date}</td>
                  <td>
                    <strong>{f.carrier} {f.flightNumber}</strong>
                    {f.cabinClass && <div>({f.cabinClass})</div>}
                  </td>
                  <td>
                    <strong>{f.departure.time}</strong> - {f.departure.city} ({f.departure.airport})
                    {f.departure.terminal && <div>Term: {f.departure.terminal} Gate: {f.departure.gate || 'TBA'}</div>}
                  </td>
                  <td>
                    <strong>{f.arrival.time}</strong> - {f.arrival.city} ({f.arrival.airport})
                    {f.arrival.terminal && <div>Term: {f.arrival.terminal} Gate: {f.arrival.gate || 'TBA'}</div>}
                  </td>
                  <td className="font-mono">{f.bookingRef || '—'}</td>
                  <td>
                    {f.passengerName || 'Traveler'}
                    {f.seat && <div>Seat {f.seat}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 5. Hotel & Accommodation Confirmations */}
      {hotelDocs.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Hotel &amp; Lodging Confirmations</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Accommodation</th>
                <th>Confirmation #</th>
                <th>Dates</th>
                <th>Room Type</th>
                <th>Address &amp; Location</th>
              </tr>
            </thead>
            <tbody>
              {hotelDocs.map((h) => (
                <tr key={h.id}>
                  <td>
                    <strong>{h.title}</strong>
                    {h.subtitle && <div>{h.subtitle}</div>}
                  </td>
                  <td className="font-mono">{h.confirmationCode || '—'}</td>
                  <td>
                    Check-in: {h.date} {h.time || '15:00'}
                    <br />
                    Check-out: {h.endDate || '—'} {h.endTime || '11:00'}
                  </td>
                  <td>
                    {h.cabinOrRoomType || 'Standard'}
                    {h.seatOrRoomNumber && <div>Room: {h.seatOrRoomNumber}</div>}
                  </td>
                  <td>{h.location || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 6. Day-by-Day Daily Schedules */}
      {trip.days && trip.days.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Day-by-Day Itinerary Schedule</h2>
          {trip.days.map((day) => (
            <div key={day.id} className="print-day-block">
              <div className="print-day-header">
                Day {day.dayNumber} · {day.title} ({day.dateStr})
              </div>
              {day.notes && (
                <div style={{ padding: '6pt 8pt', backgroundColor: '#f1f5f9', fontSize: '9pt', fontStyle: 'italic', border: '1pt solid #cbd5e1', borderTop: 'none' }}>
                  Note: {day.notes}
                </div>
              )}
              {day.stops && day.stops.length > 0 ? (
                <table className="print-table" style={{ borderTop: 'none' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '70pt' }}>Time</th>
                      <th>Place / Activity</th>
                      <th>Category</th>
                      <th>Address</th>
                      <th>Duration</th>
                      <th>Notes &amp; Confirmation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {day.stops.map((stop) => (
                      <tr key={stop.id}>
                        <td><strong>{stop.startTime}</strong></td>
                        <td>
                          <strong>{stop.title}</strong>
                          {stop.subtitle && <div style={{ fontSize: '8pt', color: '#475569' }}>{stop.subtitle}</div>}
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{stop.category}</td>
                        <td style={{ fontSize: '8.5pt' }}>{stop.address}</td>
                        <td>{stop.durationMinutes}m</td>
                        <td>
                          {stop.bookingRef && <div className="font-mono">Ref: {stop.bookingRef}</div>}
                          {stop.notes && <div style={{ fontSize: '8pt', color: '#475569' }}>{stop.notes}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div style={{ padding: '8pt', border: '1pt solid #cbd5e1', borderTop: 'none', fontSize: '9pt', color: '#64748b' }}>
                  No stops scheduled for this day.
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 7. Categorized Packing Checklist Summary */}
      {trip.packingList && trip.packingList.length > 0 && (
        <div className="print-section">
          <h2 className="print-section-title">Packing Checklist Summary</h2>
          <div className="print-packing-grid">
            {(['Clothes', 'Toiletries', 'Electronics', 'Documents', 'Essentials'] as const).map((cat) => {
              const items = (trip.packingList || []).filter((i) => i.category === cat);
              if (items.length === 0) return null;
              return (
                <div key={cat} className="print-pack-category">
                  <div className="print-pack-cat-title">{cat}</div>
                  {items.map((item) => (
                    <div key={item.id} className="print-pack-item">
                      <span className="print-checkbox">{item.packed ? ' ✓' : ''}</span>
                      <span style={{ textDecoration: item.packed ? 'line-through' : 'none' }}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

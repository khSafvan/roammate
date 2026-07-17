import React, { useState, useMemo } from 'react';
import { Plane, Hotel, Ticket, Train, Trash2, FileText, Plus, Search } from 'lucide-react';
import { BookingDocument, Flight } from '../../types/trip';
import { FlightModal } from './FlightModal';
import { HotelModal } from './HotelModal';

interface DocumentsAndTicketsHubProps {
  flights: Flight[];
  documents?: BookingDocument[];
  onAddFlight: (flight: Flight) => void;
  onDeleteFlight: (id: string) => void;
  onAddDocument: (doc: BookingDocument) => void;
  onDeleteDocument: (id: string) => void;
}

export const DocumentsAndTicketsHub: React.FC<DocumentsAndTicketsHubProps> = ({
  flights,
  documents = [],
  onAddFlight,
  onDeleteFlight,
  onAddDocument,
  onDeleteDocument,
}) => {
  const [activePillar, setActivePillar] = useState<'flights' | 'hotels' | 'all'>('flights');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | undefined>(undefined);
  const [editingHotel, setEditingHotel] = useState<BookingDocument | undefined>(undefined);

  const filteredDocs = useMemo(() => {
    let result = documents;
    if (activePillar === 'hotels') {
      result = result.filter((d) => d.category === 'hotel');
    } else if (activePillar === 'flights') {
      result = [];
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.subtitle?.toLowerCase()?.includes(q) ||
          d.location?.toLowerCase()?.includes(q)
      );
    }
    return result;
  }, [documents, activePillar, searchQuery]);

  const filteredFlights = useMemo(() => {
    if (activePillar === 'hotels') return [];
    let result = flights;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.flightNumber?.toLowerCase()?.includes(q) ||
          f.carrier?.toLowerCase()?.includes(q) ||
          f.departure?.airport?.toLowerCase()?.includes(q) ||
          f.arrival?.airport?.toLowerCase()?.includes(q) ||
          f.bookingRef?.toLowerCase()?.includes(q)
      );
    }
    return result;
  }, [flights, activePillar, searchQuery]);

  return (
    <div className="bookings-hub-container">
      <div className="section-toolbar">
        <div>
          <h2 className="section-heading">Reservations &amp; Documents Vault</h2>
          <p className="section-subheading">Flights, hotel vouchers, and travel passes</p>
        </div>

        <button className="primary-action-btn" onClick={() => {
          if (activePillar === 'flights' || activePillar === 'all') {
            setEditingFlight(undefined);
            setIsFlightModalOpen(true);
          } else {
            setEditingHotel(undefined);
            setIsHotelModalOpen(true);
          }
        }}>
          <Plus size={16} />
          <span>{activePillar === 'flights' ? 'Add Flight' : 'Add Hotel'}</span>
        </button>
      </div>

      <div className="category-filter-strip">
        <button
          className={`category-filter-btn ${activePillar === 'all' ? 'active' : ''}`}
          onClick={() => setActivePillar('all')}
        >
          <span>All Bookings</span>
          <span className="count-tag">{flights.length + documents.length}</span>
        </button>

        <button
          className={`category-filter-btn ${activePillar === 'hotels' ? 'active' : ''}`}
          onClick={() => setActivePillar('hotels')}
        >
          <span>Hotels</span>
          <span className="count-tag">{documents.filter(d => d.category === 'hotel').length}</span>
        </button>

        <button
          className={`category-filter-btn ${activePillar === 'flights' ? 'active' : ''}`}
          onClick={() => setActivePillar('flights')}
        >
          <span>Flights</span>
          <span className="count-tag">{flights.length}</span>
        </button>
      </div>

      <div className="hub-search-bar">
        <Search size={16} className="text-secondary" />
        <input
          type="text"
          placeholder="Search reservations by name, ref, or location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="hub-content-area">
        {filteredFlights.length === 0 && filteredDocs.length === 0 && (
          <div className="empty-state-box">
            <Ticket size={32} className="text-secondary mb-2" strokeWidth={1.5} />
            <h3 className="empty-state-text">No bookings found</h3>
            <p className="empty-hint">Add your flights and hotels to keep them organized.</p>
          </div>
        )}

        {filteredFlights.map((fl) => (
          <div key={fl.id} className="boarding-pass-card">
            <div className="pass-header">
              <div className="pass-carrier-row">
                <Plane size={16} className="text-blue" />
                <span className="pass-carrier">{fl.carrier}</span>
                <span className="pass-flight-num">{fl.flightNumber}</span>
                {fl.bookingRef && <span className="stub-ref">{fl.bookingRef}</span>}
              </div>
              <div className="pass-header-actions">
                <button
                  className="pass-delete-btn"
                  onClick={() => { setEditingFlight(fl); setIsFlightModalOpen(true); }}
                  title="Edit Flight"
                  style={{ marginRight: '8px' }}
                >
                  <FileText size={13} />
                </button>
                <button
                  className="pass-delete-btn"
                  onClick={() => onDeleteFlight(fl.id)}
                  title="Delete Flight"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
            <div className="pass-body">
              <div className="pass-route-row">
                <div className="route-node">
                  <span className="airport-code">{fl.departure?.airport || '???'}</span>
                  <span className="route-time">{fl.departure?.time || '00:00'}</span>
                </div>
                <div className="route-divider" />
                <div className="route-node text-right">
                  <span className="airport-code">{fl.arrival?.airport || '???'}</span>
                  <span className="route-time">{fl.arrival?.time || '00:00'}</span>
                </div>
              </div>
              {fl.passengerName && (
                <div className="pass-footer" style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Passenger: {fl.passengerName}
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredDocs.map((doc) => {
          const isHotel = doc.category === 'hotel';
          const isActivity = doc.category === 'activity';
          const isTransit = doc.category === 'transit';
          
          const CategoryIcon = isHotel
            ? Hotel
            : isActivity
            ? Ticket
            : isTransit
            ? Train
            : FileText;

          const categoryColorClass = isHotel
            ? 'color-hotel'
            : isActivity
            ? 'color-activity'
            : isTransit
            ? 'color-transit'
            : 'color-doc';

          return (
            <div key={doc.id} className={`booking-voucher-card ${categoryColorClass}`}>
              <div className="voucher-card-top">
                <div className="voucher-type-row">
                  <CategoryIcon size={16} />
                  <span className="voucher-type-name">
                    {isHotel && 'Hotel Reservation'}
                    {isActivity && 'Activity / Sight Booking'}
                    {isTransit && 'Transit Pass'}
                    {doc.category === 'doc' && 'Travel Document'}
                  </span>
                </div>

                <div style={{ display: 'flex' }}>
                  {isHotel && (
                    <button
                      className="pass-delete-btn"
                      onClick={() => { setEditingHotel(doc); setIsHotelModalOpen(true); }}
                      title="Edit Hotel"
                      style={{ marginRight: '8px' }}
                    >
                      <FileText size={13} />
                    </button>
                  )}
                  <button
                    className="pass-delete-btn"
                    onClick={() => onDeleteDocument(doc.id)}
                    title="Delete Document"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="voucher-main-body">
                <h3 className="voucher-title">{doc.title}</h3>
                {doc.subtitle && <p className="voucher-subtitle">{doc.subtitle}</p>}

                {doc.location && (
                  <div className="voucher-info-item mt-1">
                    <span>{doc.location}</span>
                  </div>
                )}

                <div className="voucher-dates-row" style={{ marginTop: '12px', display: 'flex', gap: '16px' }}>
                  {doc.date && (
                    <div className="voucher-info-item text-slate text-sm">
                      <span>
                        {isHotel ? 'Check-in: ' : ''}
                        {doc.date} {doc.time ? `(${doc.time})` : ''}
                      </span>
                    </div>
                  )}

                  {doc.endDate && (
                    <div className="voucher-info-item text-slate text-sm">
                      <span>
                        Check-out: {doc.endDate} {doc.endTime ? `(${doc.endTime})` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {(doc.passengerOrGuestName || doc.confirmationCode) && (
                  <div className="voucher-guest-strip" style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-canvas)', borderRadius: '6px' }}>
                    {doc.passengerOrGuestName && (
                      <div className="text-sm">Guest: <strong>{doc.passengerOrGuestName}</strong></div>
                    )}
                    {doc.confirmationCode && (
                      <div className="text-sm mt-1">Ref: <strong>{doc.confirmationCode}</strong></div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <FlightModal
        isOpen={isFlightModalOpen}
        onClose={() => setIsFlightModalOpen(false)}
        onSave={(f) => { onAddFlight(f); setIsFlightModalOpen(false); }}
        initialFlight={editingFlight}
        travelers={['Safvan', 'Riyana']}
      />
      <HotelModal
        isOpen={isHotelModalOpen}
        onClose={() => setIsHotelModalOpen(false)}
        onSave={(h) => { onAddDocument(h); setIsHotelModalOpen(false); }}
        initialHotel={editingHotel}
        travelers={['Safvan', 'Riyana']}
      />
    </div>
  );
};

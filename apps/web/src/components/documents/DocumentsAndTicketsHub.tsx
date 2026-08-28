import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plane, Ticket, Train, Trash2, FileText, Plus, Search, Hotel, ChevronDown } from 'lucide-react';
import { BookingDocument, Flight } from '../../types/trip';
import { FlightModal } from './FlightModal';
import { HotelModal } from './HotelModal';
import { ActivityPassModal } from './ActivityPassModal';
import "./DocumentsAndTicketsHub.css";

interface DocumentsAndTicketsHubProps {
  flights: Flight[];
  documents?: BookingDocument[];
  travelers?: string[];
  onAddFlight: (flight: Flight) => void;
  onDeleteFlight: (id: string) => void;
  onAddDocument: (doc: BookingDocument) => void;
  onDeleteDocument: (id: string) => void;
}

export const DocumentsAndTicketsHub: React.FC<DocumentsAndTicketsHubProps> = ({
  flights,
  documents = [],
  travelers = [],
  onAddFlight,
  onDeleteFlight,
  onAddDocument,
  onDeleteDocument,
}) => {
  const effectiveTravelers = travelers && travelers.length > 0 ? travelers : ['John', 'Jane'];
  const [activePillar, setActivePillar] = useState<'all' | 'flights' | 'hotels' | 'activities' | 'transit'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
  const [isHotelModalOpen, setIsHotelModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  
  const [editingFlight, setEditingFlight] = useState<Flight | undefined>(undefined);
  const [editingDoc, setEditingDoc] = useState<BookingDocument | undefined>(undefined);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDocs = useMemo(() => {
    let result = documents;
    if (activePillar === 'hotels') result = result.filter(d => d.category === 'hotel');
    else if (activePillar === 'activities') result = result.filter(d => d.category === 'activity' || d.category === 'doc');
    else if (activePillar === 'transit') result = result.filter(d => d.category === 'transit');
    else if (activePillar === 'flights') result = [];

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
    if (activePillar !== 'all' && activePillar !== 'flights') return [];
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

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button className="primary-action-btn" onClick={() => setIsDropdownOpen(!isDropdownOpen)}>
            <Plus size={16} />
            <span>Add Booking</span>
            <ChevronDown size={14} style={{ marginLeft: '4px' }} />
          </button>
          
          {isDropdownOpen && (
            <div className="hub-add-dropdown">
              <button className="hub-add-dropdown-item" onClick={() => { setIsDropdownOpen(false); setEditingFlight(undefined); setIsFlightModalOpen(true); }}>
                <Plane size={16} className="text-blue" /> Add Flight
              </button>
              <button className="hub-add-dropdown-item" onClick={() => { setIsDropdownOpen(false); setEditingDoc(undefined); setIsHotelModalOpen(true); }}>
                <Hotel size={16} className="text-emerald" /> Add Hotel
              </button>
              <button className="hub-add-dropdown-item" onClick={() => { setIsDropdownOpen(false); setEditingDoc({ category: 'activity' } as any); setIsActivityModalOpen(true); }}>
                <Ticket size={16} className="text-purple" /> Add Activity / Venue
              </button>
              <button className="hub-add-dropdown-item" onClick={() => { setIsDropdownOpen(false); setEditingDoc({ category: 'transit' } as any); setIsActivityModalOpen(true); }}>
                <Train size={16} className="text-green" /> Add Transit
              </button>
              <button className="hub-add-dropdown-item" onClick={() => { setIsDropdownOpen(false); setEditingDoc({ category: 'doc' } as any); setIsActivityModalOpen(true); }}>
                <FileText size={16} className="text-slate" /> Add Generic Booking
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="category-filter-strip">
        <button className={`category-filter-btn ${activePillar === 'all' ? 'active' : ''}`} onClick={() => setActivePillar('all')}>
          <span>All Bookings</span>
          <span className="count-tag">{flights.length + documents.length}</span>
        </button>
        <button className={`category-filter-btn ${activePillar === 'flights' ? 'active' : ''}`} onClick={() => setActivePillar('flights')}>
          <span>Flights</span>
          <span className="count-tag">{flights.length}</span>
        </button>
        <button className={`category-filter-btn ${activePillar === 'hotels' ? 'active' : ''}`} onClick={() => setActivePillar('hotels')}>
          <span>Hotels</span>
          <span className="count-tag">{documents.filter(d => d.category === 'hotel').length}</span>
        </button>
        <button className={`category-filter-btn ${activePillar === 'activities' ? 'active' : ''}`} onClick={() => setActivePillar('activities')}>
          <span>Activities</span>
          <span className="count-tag">{documents.filter(d => d.category === 'activity' || d.category === 'doc').length}</span>
        </button>
        <button className={`category-filter-btn ${activePillar === 'transit' ? 'active' : ''}`} onClick={() => setActivePillar('transit')}>
          <span>Transit</span>
          <span className="count-tag">{documents.filter(d => d.category === 'transit').length}</span>
        </button>
      </div>

      <div className="search-and-travelers-bar" style={{ marginTop: '16px' }}>
        <div className="search-input-box">
          <Search size={16} className="text-secondary" />
          <input
            className="search-field"
            type="text"
            placeholder="Search reservations by name, ref, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="hub-content-area">
        {filteredFlights.length === 0 && filteredDocs.length === 0 && (
          <div className="empty-state-box">
            <Ticket size={32} className="text-secondary mb-2" strokeWidth={1.5} />
            <h3 className="empty-state-text">No bookings found</h3>
            <p className="empty-hint">Add your flights, hotels, and activities to keep them organized.</p>
          </div>
        )}

        <div className="flights-ticket-grid">
          {filteredFlights.map((fl) => (
            <div key={fl.id} className="airline-ticket-card">
              <div className="ticket-main-section">
                <div className="pass-header">
                  <div className="pass-carrier-row">
                    <Plane size={16} className="text-blue" />
                    <span className="pass-carrier">{fl.carrier}</span>
                  </div>
                  <div className="pass-header-actions">
                    <button className="pass-delete-btn" onClick={() => { setEditingFlight(fl); setIsFlightModalOpen(true); }} title="Edit Flight"><FileText size={13} /></button>
                    <button className="pass-delete-btn" onClick={() => onDeleteFlight(fl.id)} title="Delete Flight"><Trash2 size={13} /></button>
                  </div>
                </div>

                <div className="pass-route-row" style={{ marginTop: 'auto', marginBottom: 'auto' }}>
                  <div className="airport-block">
                    <div className="airport-code-row"><span className="airport-code">{fl.departure?.airport || '???'}</span></div>
                    <div className="airport-time">{fl.departure?.time || '00:00'}</div>
                  </div>
                  <div className="route-graphic">
                    <div className="route-line-decor" />
                    <div className="plane-icon-wrap"><Plane size={16} className="plane-graphic-icon" strokeWidth={2.5} /></div>
                    <div className="route-line-decor" />
                  </div>
                  <div className="airport-block text-right">
                    <div className="airport-code-row" style={{ justifyContent: 'flex-end' }}>
                      <span className="airport-code">{fl.arrival?.airport || '???'}</span>
                      {fl.arrival?.nextDay && <span className="next-day-sup">+1</span>}
                    </div>
                    <div className="airport-time">{fl.arrival?.time || '00:00'}</div>
                  </div>
                </div>
                
                {fl.passengerName && (
                  <div className="pass-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PASSENGER: {fl.passengerName}</span>
                  </div>
                )}
              </div>
              
              <div className="ticket-stub-section">
                <div style={{ textAlign: 'center', width: '100%' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>FLIGHT</div>
                  <div className="pass-flight-num" style={{ marginTop: '4px', fontSize: '14px', background: 'transparent', border: 'none', padding: 0 }}>{fl.flightNumber}</div>
                </div>
                
                {fl.bookingRef && (
                  <div style={{ textAlign: 'center', marginTop: '16px', width: '100%' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>PNR</div>
                    <div className="stub-ref" style={{ fontSize: '13px', marginTop: '2px' }}>{fl.bookingRef}</div>
                  </div>
                )}
                
                <div style={{ textAlign: 'center', marginTop: 'auto', width: '100%' }}>
                  <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>CLASS</div>
                  <div style={{ fontSize: '12px', fontWeight: 700, marginTop: '2px' }}>{fl.cabinClass || 'ECONOMY'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDocs.filter(d => d.category === 'hotel').length > 0 && (
          <div className="hotels-key-grid" style={{ marginTop: filteredFlights.length > 0 ? '24px' : '0' }}>
            {filteredDocs.filter(d => d.category === 'hotel').map((doc) => (
              <div key={doc.id} className="hotel-key-card">
                <div className="key-card-strip" />
                <div>
                  <div className="key-card-chip" />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, paddingRight: '20px' }}>{doc.title}</h3>
                    <div style={{ display: 'flex', gap: '8px', zIndex: 1 }}>
                      <button className="pass-delete-btn" style={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => { setEditingDoc(doc); setIsHotelModalOpen(true); }}><FileText size={13} /></button>
                      <button className="pass-delete-btn" style={{ color: 'rgba(255,255,255,0.7)' }} onClick={() => onDeleteDocument(doc.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  {doc.subtitle && <p style={{ fontSize: '13px', opacity: 0.8, marginTop: '4px' }}>{doc.subtitle}</p>}
                </div>
                
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', opacity: 0.9, marginBottom: '8px' }}>
                    <span>{doc.date}</span>
                    {doc.endDate && <span>→ {doc.endDate}</span>}
                  </div>
                  {(doc.passengerOrGuestName || doc.confirmationCode) && (
                    <div style={{ fontSize: '13px', fontFamily: 'monospace', letterSpacing: '1px', opacity: 0.9 }}>
                      {doc.passengerOrGuestName && <span>{doc.passengerOrGuestName}</span>}
                      {doc.passengerOrGuestName && doc.confirmationCode && <span> • </span>}
                      {doc.confirmationCode && <span>{doc.confirmationCode}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredDocs.filter(d => d.category !== 'hotel').length > 0 && (
          <div className="other-bookings-grid" style={{ marginTop: (filteredFlights.length > 0 || filteredDocs.filter(d => d.category === 'hotel').length > 0) ? '24px' : '0' }}>
            {filteredDocs.filter(d => d.category !== 'hotel').map((doc) => {
              const isActivity = doc.category === 'activity';
              const isTransit = doc.category === 'transit';
              const CategoryIcon = isActivity ? Ticket : isTransit ? Train : FileText;
              
              return (
                <div key={doc.id} className="horizontal-booking-card">
                  <div className="horizontal-booking-card-icon">
                    <CategoryIcon size={20} className={isActivity ? 'text-purple' : isTransit ? 'text-green' : 'text-slate'} />
                  </div>
                  
                  <div className="horizontal-booking-card-content">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{doc.title}</h3>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="pass-delete-btn" onClick={() => { setEditingDoc(doc); setIsActivityModalOpen(true); }}><FileText size={13} /></button>
                        <button className="pass-delete-btn" onClick={() => onDeleteDocument(doc.id)}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    
                    {doc.subtitle && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>{doc.subtitle}</p>}
                    
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {doc.date && <span>{doc.date} {doc.time ? doc.time : ''}</span>}
                      {doc.location && <span>{doc.location}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <FlightModal
        isOpen={isFlightModalOpen}
        onClose={() => setIsFlightModalOpen(false)}
        onSave={(f) => { onAddFlight(f); setIsFlightModalOpen(false); }}
        initialFlight={editingFlight}
        travelers={effectiveTravelers}
      />
      <HotelModal
        isOpen={isHotelModalOpen}
        onClose={() => setIsHotelModalOpen(false)}
        onSave={(h) => { onAddDocument(h); setIsHotelModalOpen(false); }}
        initialHotel={editingDoc?.category === 'hotel' ? editingDoc : undefined}
        travelers={effectiveTravelers}
      />
      <ActivityPassModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        onSave={(d) => { onAddDocument(d); setIsActivityModalOpen(false); }}
        initialDoc={editingDoc?.category !== 'hotel' ? editingDoc : undefined}
      />
    </div>
  );
};

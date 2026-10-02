import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plane, Ticket, Train, Trash2, FileText, Plus, Search, Hotel, ChevronDown } from 'lucide-react';
import { BookingDocument, Flight } from '../../types/trip';
import { FlightModal } from './FlightModal';
import { HotelModal } from './HotelModal';
import { ActivityPassModal } from './ActivityPassModal';
import "./DocumentsAndTicketsHub.css";
import { Button } from "../../components/ui/Button";

interface DocumentsAndTicketsHubProps {
  flights: Flight[];
  documents?: BookingDocument[];
  travelers?: string[];
  isLoading?: boolean;
  onAddFlight: (flight: Flight) => void;
  onDeleteFlight: (id: string) => void;
  onAddDocument: (doc: BookingDocument) => void;
  onDeleteDocument: (id: string) => void;
}

export const DocumentsAndTicketsHub: React.FC<DocumentsAndTicketsHubProps> = ({
  flights,
  documents = [],
  travelers = [],
  isLoading,
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

  if (isLoading) {
    return (
      <div className="bookings-hub-container" style={{ padding: '24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '24px' }}>
          <div className="skeleton" style={{ height: '140px' }} />
          <div className="skeleton" style={{ height: '140px' }} />
          <div className="skeleton" style={{ height: '140px' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="bookings-hub-container">
      <div className="section-toolbar">
        <div>
          <h2 className="section-heading">Reservations &amp; Documents Vault</h2>
          <p className="section-subheading">Flights, hotel vouchers, and travel passes</p>
        </div>

        <div className="dropdown-wrapper" ref={dropdownRef}>
          <Button className="primary-action-btn" onClick={() => setIsDropdownOpen(!isDropdownOpen)} variant="primary">
            <Plus size={16} />
            <span>Add Booking</span>
            <ChevronDown size={14} className="ml-1" />
          </Button>
          
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

      <div className="search-and-travelers-bar mt-4">
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
          <div className="not-found-state">
            <span className="not-found-icon">🔍</span>
            <span className="not-found-title">No items found</span>
            <span className="not-found-hint">Add your flights, hotels, and activities to keep them organized.</span>
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

                <div className="pass-route-row my-auto">
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
                    <div className="airport-code-row justify-end">
                      <span className="airport-code">{fl.arrival?.airport || '???'}</span>
                      {fl.arrival?.nextDay && <span className="next-day-sup">+1</span>}
                    </div>
                    <div className="airport-time">{fl.arrival?.time || '00:00'}</div>
                  </div>
                </div>
                
                {fl.passengerName && (
                  <div className="pass-footer no-border p-0">
                    <span className="pass-passenger">PASSENGER: {fl.passengerName}</span>
                  </div>
                )}
              </div>
              
              <div className="ticket-stub-section">
                <div className="text-center w-full">
                  <div className="meta-label">FLIGHT</div>
                  <div className="pass-flight-num mt-1">{fl.flightNumber}</div>
                </div>
                
                {fl.bookingRef && (
                  <div className="text-center mt-4 w-full">
                    <div className="meta-label">PNR</div>
                    <div className="stub-ref stub-ref-text">{fl.bookingRef}</div>
                  </div>
                )}
                
                <div className="text-center mt-auto w-full">
                  <div className="meta-label">CLASS</div>
                  <div className="stub-class-text">{fl.cabinClass || 'ECONOMY'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredDocs.filter(d => d.category === 'hotel').length > 0 && (
          <div className="flights-ticket-grid" style={{ marginTop: filteredFlights.length > 0 ? '24px' : '0' }}>
            {filteredDocs.filter(d => d.category === 'hotel').map((doc) => (
              <div key={doc.id} className="airline-ticket-card">
                <div className="ticket-main-section">
                  <div className="pass-header">
                    <div className="pass-carrier-row">
                      <Hotel size={16} className="text-emerald" />
                      <span className="pass-carrier">{doc.title}</span>
                    </div>
                    <div className="pass-header-actions">
                      <button className="pass-delete-btn" onClick={() => { setEditingDoc(doc); setIsHotelModalOpen(true); }}><FileText size={13} /></button>
                      <button className="pass-delete-btn" onClick={() => onDeleteDocument(doc.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  
                  {doc.subtitle && <p className="doc-subtitle mt-4">{doc.subtitle}</p>}
                  
                  <div className="pass-route-row my-auto">
                    <div className="doc-meta">
                      {doc.date && <span>Check-in: {doc.date}</span>}
                      {doc.endDate && <span>Check-out: {doc.endDate}</span>}
                    </div>
                  </div>
                  
                  {(doc.passengerOrGuestName) && (
                    <div className="pass-footer no-border p-0">
                      <span className="pass-passenger">GUEST: {doc.passengerOrGuestName}</span>
                    </div>
                  )}
                </div>
                
                <div className="ticket-stub-section">
                  <div className="text-center w-full">
                    <div className="meta-label">HOTEL VOUCHER</div>
                  </div>
                  
                  {doc.confirmationCode && (
                    <div className="text-center mt-4 w-full">
                      <div className="meta-label">CONFIRMATION</div>
                      <div className="stub-ref stub-ref-text">{doc.confirmationCode}</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredDocs.filter(d => d.category !== 'hotel').length > 0 && (
          <div className="flights-ticket-grid" style={{ marginTop: (filteredFlights.length > 0 || filteredDocs.filter(d => d.category === 'hotel').length > 0) ? '24px' : '0' }}>
            {filteredDocs.filter(d => d.category !== 'hotel').map((doc) => {
              const isActivity = doc.category === 'activity';
              const isTransit = doc.category === 'transit';
              const CategoryIcon = isActivity ? Ticket : isTransit ? Train : FileText;
              const iconClass = isActivity ? 'text-purple' : isTransit ? 'text-green' : 'text-slate';
              
              return (
                <div key={doc.id} className="airline-ticket-card">
                  <div className="ticket-main-section">
                    <div className="pass-header">
                      <div className="pass-carrier-row">
                        <CategoryIcon size={16} className={iconClass} />
                        <span className="pass-carrier">{doc.title}</span>
                      </div>
                      <div className="pass-header-actions">
                        <button className="pass-delete-btn" onClick={() => { setEditingDoc(doc); setIsActivityModalOpen(true); }}><FileText size={13} /></button>
                        <button className="pass-delete-btn" onClick={() => onDeleteDocument(doc.id)}><Trash2 size={13} /></button>
                      </div>
                    </div>
                    
                    {doc.subtitle && <p className="doc-subtitle mt-4">{doc.subtitle}</p>}
                    
                    <div className="pass-route-row my-auto">
                      <div className="doc-meta">
                        {doc.date && <span>Date: {doc.date} {doc.time ? `at ${doc.time}` : ''}</span>}
                        {doc.location && <span>Loc: {doc.location}</span>}
                      </div>
                    </div>
                  </div>
                  
                  <div className="ticket-stub-section">
                    <div className="text-center w-full">
                      <div className="meta-label">PASS / TICKET</div>
                    </div>
                    
                    {doc.confirmationCode && (
                      <div className="text-center mt-4 w-full">
                        <div className="meta-label">REFERENCE</div>
                        <div className="stub-ref stub-ref-text">{doc.confirmationCode}</div>
                      </div>
                    )}
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

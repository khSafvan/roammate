import React, { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileText,
  Globe,
  Hotel,
  MapPin,
  Navigation2,
  Plane,
  Plus,
  QrCode,
  Radio,
  Search,
  Tag,
  Ticket,
  Train,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { BookingDocument, Flight, ReservationCategory } from '../../types/trip';

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
  const [activeCategory, setActiveCategory] = useState<ReservationCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompanion, setSelectedCompanion] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Reservation Form State
  const [formCategory, setFormCategory] = useState<ReservationCategory>('flight');
  const [title, setTitle] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [location, setLocation] = useState('');
  const [passengerOrGuestName, setPassengerOrGuestName] = useState('');
  const [cabinOrRoomType, setCabinOrRoomType] = useState('');
  const [seatOrRoomNumber, setSeatOrRoomNumber] = useState('');
  const [notes, setNotes] = useState('');

  // Flight specific form states
  const [flightNumber, setFlightNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [depAirport, setDepAirport] = useState('');
  const [arrAirport, setArrAirport] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  const [originCity, setOriginCity] = useState('');

  // Extract companions across flights & documents
  const companionNames = useMemo(() => {
    const set = new Set<string>();
    flights.forEach((f) => {
      if (f.passengerName) set.add(f.passengerName);
    });
    documents.forEach((d) => {
      if (d.passengerOrGuestName) set.add(d.passengerOrGuestName);
    });
    return Array.from(set);
  }, [flights, documents]);

  // Counts by category
  const counts = useMemo(() => {
    return {
      all: flights.length + documents.length,
      flight: flights.length,
      hotel: documents.filter((d) => d.category === 'hotel').length,
      activity: documents.filter((d) => d.category === 'activity').length,
      transit: documents.filter((d) => d.category === 'transit').length,
      doc: documents.filter((d) => d.category === 'doc').length,
    };
  }, [flights, documents]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    let result = documents;
    if (activeCategory !== 'all') {
      result = result.filter((d) => d.category === activeCategory);
    }
    if (selectedCompanion !== 'all') {
      result = result.filter(
        (d) => d.passengerOrGuestName && d.passengerOrGuestName.includes(selectedCompanion)
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.confirmationCode?.toLowerCase().includes(q) ||
          d.location?.toLowerCase().includes(q) ||
          d.notes?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [documents, activeCategory, selectedCompanion, searchQuery]);

  // Filtered flights
  const filteredFlights = useMemo(() => {
    if (activeCategory !== 'all' && activeCategory !== 'flight') return [];
    let result = flights;
    if (selectedCompanion !== 'all') {
      result = result.filter((f) => f.passengerName === selectedCompanion);
    }
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
  }, [flights, activeCategory, selectedCompanion, searchQuery]);

  const handleModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formCategory === 'flight') {
      if (!flightNumber || !depAirport || !arrAirport) return;
      const newFlight: Flight = {
        id: `fl_${Date.now()}`,
        flightNumber: flightNumber.toUpperCase().trim(),
        carrier: carrier.trim() || 'Airline',
        date: date || new Date().toISOString().split('T')[0],
        passengerName: passengerOrGuestName.trim() || undefined,
        originCountry: originCountry.trim() || undefined,
        originCity: originCity.trim() || undefined,
        cabinClass: (cabinOrRoomType as any) || 'Economy',
        bookingRef: confirmationCode.trim() || undefined,
        seat: seatOrRoomNumber.trim() || undefined,
        notes: notes.trim() || undefined,
        departure: {
          airport: depAirport.toUpperCase().trim(),
          city: originCity.trim() || depAirport.toUpperCase().trim(),
          time: time || '12:00',
        },
        arrival: {
          airport: arrAirport.toUpperCase().trim(),
          city: arrAirport.toUpperCase().trim(),
          time: endTime || '15:00',
        },
      };
      onAddFlight(newFlight);
    } else {
      if (!title.trim()) return;
      const newDoc: BookingDocument = {
        id: `doc_${Date.now()}`,
        category: formCategory,
        title: title.trim(),
        confirmationCode: confirmationCode.trim() || undefined,
        date: date || undefined,
        time: time || undefined,
        endDate: endDate || undefined,
        endTime: endTime || undefined,
        location: location.trim() || undefined,
        passengerOrGuestName: passengerOrGuestName.trim() || undefined,
        cabinOrRoomType: cabinOrRoomType.trim() || undefined,
        seatOrRoomNumber: seatOrRoomNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      onAddDocument(newDoc);
    }

    setIsModalOpen(false);
    // Reset inputs
    setTitle('');
    setConfirmationCode('');
    setDate('');
    setTime('');
    setEndDate('');
    setEndTime('');
    setLocation('');
    setPassengerOrGuestName('');
    setCabinOrRoomType('');
    setSeatOrRoomNumber('');
    setNotes('');
    setFlightNumber('');
    setCarrier('');
    setDepAirport('');
    setArrAirport('');
  };

  return (
    <div className="bookings-hub-container">
      {/* Top Header */}
      <div className="section-toolbar">
        <div>
          <h2 className="section-heading">Reservations &amp; Documents Vault</h2>
          <p className="section-subheading">
            Flights, hotel vouchers, activity passes, transit cards &amp; travel receipts
          </p>
        </div>

        <button className="primary-action-btn" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} />
          <span>Add Reservation / Document</span>
        </button>
      </div>

      {/* Category Pills Filter */}
      <div className="category-filter-strip">
        <button
          className={`category-filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveCategory('all')}
        >
          <span>All Items</span>
          <span className="count-tag">{counts.all}</span>
        </button>

        <button
          className={`category-filter-btn ${activeCategory === 'flight' ? 'active' : ''}`}
          onClick={() => setActiveCategory('flight')}
        >
          <Plane size={13} />
          <span>Flights</span>
          <span className="count-tag">{counts.flight}</span>
        </button>

        <button
          className={`category-filter-btn ${activeCategory === 'hotel' ? 'active' : ''}`}
          onClick={() => setActiveCategory('hotel')}
        >
          <Hotel size={13} />
          <span>Hotels &amp; Stays</span>
          <span className="count-tag">{counts.hotel}</span>
        </button>

        <button
          className={`category-filter-btn ${activeCategory === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveCategory('activity')}
        >
          <Ticket size={13} />
          <span>Activities &amp; Sights</span>
          <span className="count-tag">{counts.activity}</span>
        </button>

        <button
          className={`category-filter-btn ${activeCategory === 'transit' ? 'active' : ''}`}
          onClick={() => setActiveCategory('transit')}
        >
          <Train size={13} />
          <span>Transit Passes</span>
          <span className="count-tag">{counts.transit}</span>
        </button>

        <button
          className={`category-filter-btn ${activeCategory === 'doc' ? 'active' : ''}`}
          onClick={() => setActiveCategory('doc')}
        >
          <FileText size={13} />
          <span>Travel Docs</span>
          <span className="count-tag">{counts.doc}</span>
        </button>
      </div>

      {/* Search and Companion Filter Bar */}
      <div className="search-and-travelers-bar">
        <div className="search-input-box">
          <Search size={15} className="text-tertiary" />
          <input
            type="text"
            placeholder="Search by hotel, flight number, confirmation code, location..."
            className="search-field"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={13} />
            </button>
          )}
        </div>

        {companionNames.length > 0 && (
          <div className="travelers-chip-group">
            <span className="travelers-label">
              <Users size={12} />
              <span>Traveler:</span>
            </span>
            <button
              className={`traveler-filter-chip ${selectedCompanion === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCompanion('all')}
            >
              All
            </button>
            {companionNames.map((name) => (
              <button
                key={name}
                className={`traveler-filter-chip ${selectedCompanion === name ? 'active' : ''}`}
                onClick={() => setSelectedCompanion(name)}
              >
                <User size={10} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Vault Grid */}
      <div className="bookings-grid">
        {/* Render Flight Passes */}
        {filteredFlights.map((fl) => {
          const flightTrackerUrl = `https://www.flightradar24.com/data/flights/${fl.flightNumber.toLowerCase()}`;

          return (
            <div key={fl.id} className="boarding-pass-card">
              <div className="pass-header">
                <div className="pass-carrier-row">
                  <Plane size={16} className="text-blue" />
                  <span className="pass-carrier">{fl.carrier}</span>
                  <span className="pass-flight-num">{fl.flightNumber}</span>
                </div>
                <div className="pass-header-actions">
                  <a
                    href={flightTrackerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="live-radar-tag"
                  >
                    <Radio size={12} className="radar-pulse" />
                    <span>Live Radar</span>
                    <ExternalLink size={10} />
                  </a>
                  <button
                    className="pass-delete-btn"
                    onClick={() => onDeleteFlight(fl.id)}
                    title="Delete Flight"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              {/* Multi-Origin Companion Ribbon */}
              {(fl.passengerName || fl.originCountry || fl.cabinClass) && (
                <div className="passenger-ticket-ribbon">
                  {fl.passengerName && (
                    <span className="passenger-badge">
                      <User size={12} className="text-blue" />
                      <strong>{fl.passengerName}</strong>
                    </span>
                  )}
                  {(fl.originCountry || fl.originCity) && (
                    <span className="origin-badge">
                      <Globe size={11} className="text-slate" />
                      <span>
                        From {fl.originCity ? `${fl.originCity}, ` : ''}
                        {fl.originCountry || fl.departure.city}
                      </span>
                    </span>
                  )}
                  {fl.cabinClass && (
                    <span className="cabin-badge">
                      <Tag size={11} />
                      <span>{fl.cabinClass}</span>
                    </span>
                  )}
                </div>
              )}

              <div className="pass-route-row">
                <div className="airport-block">
                  <span className="airport-code">{fl.departure.airport}</span>
                  <span className="airport-time">{fl.departure.time}</span>
                  <span className="airport-meta">
                    {fl.departure.city || fl.departure.terminal || 'Departure'}
                  </span>
                </div>

                <div className="route-graphic">
                  <div className="route-line-decor" />
                  <Navigation2 size={18} className="plane-graphic-icon" />
                  <div className="route-line-decor" />
                </div>

                <div className="airport-block text-right">
                  <span className="airport-code">{fl.arrival.airport}</span>
                  <span className="airport-time">
                    {fl.arrival.time}
                    {fl.arrival.nextDay && <sup className="next-day-sup">+1d</sup>}
                  </span>
                  <span className="airport-meta">
                    {fl.arrival.city || fl.arrival.terminal || 'Arrival'}
                  </span>
                </div>
              </div>

              <div className="pass-footer">
                <div className="pass-stub-item">
                  <Calendar size={12} />
                  <span>{fl.date}</span>
                </div>
                {fl.seat && (
                  <div className="pass-stub-item">
                    <Ticket size={12} />
                    <span>Seat: {fl.seat}</span>
                  </div>
                )}
                {fl.bookingRef && (
                  <div className="pass-stub-item">
                    <span className="stub-ref">Ref: {fl.bookingRef}</span>
                  </div>
                )}
              </div>

              {fl.notes && <div className="pass-notes-strip">{fl.notes}</div>}
            </div>
          );
        })}

        {/* Render Hotel Vouchers & Activity Passes & Travel Docs */}
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

                <button
                  className="pass-delete-btn"
                  onClick={() => onDeleteDocument(doc.id)}
                  title="Delete Document"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              <div className="voucher-main-body">
                <h3 className="voucher-title">{doc.title}</h3>
                {doc.subtitle && <p className="voucher-subtitle">{doc.subtitle}</p>}

                {doc.location && (
                  <div className="voucher-info-item mt-1">
                    <MapPin size={12} className="text-slate flex-shrink-0" />
                    <span>{doc.location}</span>
                  </div>
                )}

                <div className="voucher-dates-row">
                  {doc.date && (
                    <div className="voucher-info-item">
                      <Calendar size={12} className="text-slate flex-shrink-0" />
                      <span>
                        {isHotel ? 'Check-in: ' : ''}
                        {doc.date} {doc.time ? `(${doc.time})` : ''}
                      </span>
                    </div>
                  )}

                  {doc.endDate && (
                    <div className="voucher-info-item">
                      <Clock size={12} className="text-slate flex-shrink-0" />
                      <span>
                        Check-out: {doc.endDate} {doc.endTime ? `(${doc.endTime})` : ''}
                      </span>
                    </div>
                  )}
                </div>

                {/* Guest / Traveler badge */}
                {(doc.passengerOrGuestName || doc.cabinOrRoomType || doc.seatOrRoomNumber) && (
                  <div className="voucher-guest-strip">
                    {doc.passengerOrGuestName && (
                      <span className="guest-badge">
                        <User size={11} />
                        <span>{doc.passengerOrGuestName}</span>
                      </span>
                    )}
                    {doc.cabinOrRoomType && (
                      <span className="guest-sub-badge">{doc.cabinOrRoomType}</span>
                    )}
                    {doc.seatOrRoomNumber && (
                      <span className="guest-sub-badge font-mono">
                        {doc.seatOrRoomNumber}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="voucher-footer">
                {doc.confirmationCode && (
                  <div className="voucher-code-pill font-mono">
                    <span>Ref:</span>
                    <strong>{doc.confirmationCode}</strong>
                  </div>
                )}

                {doc.qrCodeData && (
                  <div className="voucher-qr-tag" title="Digital QR Pass Ready">
                    <QrCode size={13} className="text-emerald" />
                    <span>Digital Pass Ready</span>
                  </div>
                )}
              </div>

              {doc.notes && <div className="voucher-notes-strip">{doc.notes}</div>}
            </div>
          );
        })}

        {filteredFlights.length === 0 && filteredDocs.length === 0 && (
          <div className="empty-state-box full-span">
            <Ticket size={36} className="text-slate" />
            <p className="empty-state-text">No reservations or passes in this category.</p>
            <button className="secondary-action-btn" onClick={() => setIsModalOpen(true)}>
              Add reservation voucher
            </button>
          </div>
        )}
      </div>

      {/* Add Reservation / Document Modal */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px' }}
          >
            <div className="modal-header">
              <div className="modal-header-left">
                <div className="auth-header-icon">
                  <FileCheck size={18} className="text-blue" />
                </div>
                <div>
                  <h3 className="modal-title">Add Booking or Document</h3>
                  <p className="modal-subtitle">
                    Organize flights, hotels, activities, and travel passes
                  </p>
                </div>
              </div>
              <button
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="auth-content-col">
              {/* Category Selector Tabs */}
              <div className="modal-type-tabs">
                {(['flight', 'hotel', 'activity', 'transit', 'doc'] as ReservationCategory[]).map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      className={`modal-type-tab ${formCategory === cat ? 'active' : ''}`}
                      onClick={() => setFormCategory(cat)}
                    >
                      {cat === 'flight' && '✈️ Flight'}
                      {cat === 'hotel' && '🏨 Hotel'}
                      {cat === 'activity' && '🎟️ Activity'}
                      {cat === 'transit' && '🚆 Transit'}
                      {cat === 'doc' && '📄 Document'}
                    </button>
                  )
                )}
              </div>

              {/* FLIGHT SPECIFIC INPUTS */}
              {formCategory === 'flight' ? (
                <>
                  <div className="form-row-2">
                    <div>
                      <label className="form-label">Passenger Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Alex, Elena (London)"
                        className="form-input"
                        value={passengerOrGuestName}
                        onChange={(e) => setPassengerOrGuestName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Cabin Class</label>
                      <select
                        className="form-input"
                        value={cabinOrRoomType}
                        onChange={(e) => setCabinOrRoomType(e.target.value)}
                      >
                        <option value="Economy">Economy</option>
                        <option value="Premium Economy">Premium Economy</option>
                        <option value="Business">Business</option>
                        <option value="First">First Class</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div>
                      <label className="form-label">Flight Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. JL005, BA007"
                        className="form-input"
                        value={flightNumber}
                        onChange={(e) => setFlightNumber(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Carrier</label>
                      <input
                        type="text"
                        placeholder="e.g. Japan Airlines"
                        className="form-input"
                        value={carrier}
                        onChange={(e) => setCarrier(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div>
                      <label className="form-label">Departure Airport (IATA) *</label>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        placeholder="e.g. JFK, LHR"
                        className="form-input text-uppercase"
                        value={depAirport}
                        onChange={(e) => setDepAirport(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Arrival Airport (IATA) *</label>
                      <input
                        type="text"
                        required
                        maxLength={4}
                        placeholder="e.g. HND, CDG"
                        className="form-input text-uppercase"
                        value={arrAirport}
                        onChange={(e) => setArrAirport(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div>
                      <label className="form-label">Origin City</label>
                      <input
                        type="text"
                        placeholder="e.g. New York, London"
                        className="form-input"
                        value={originCity}
                        onChange={(e) => setOriginCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Origin Country</label>
                      <input
                        type="text"
                        placeholder="e.g. United States, UK"
                        className="form-input"
                        value={originCountry}
                        onChange={(e) => setOriginCountry(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row-2">
                    <div>
                      <label className="form-label">Departure Date &amp; Time</label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          className="form-input flex-1"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="13:15"
                          className="form-input w-24"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="form-label">Arrival Time &amp; Seat</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="16:30"
                          className="form-input flex-1"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="Seat 24A"
                          className="form-input w-28"
                          value={seatOrRoomNumber}
                          onChange={(e) => setSeatOrRoomNumber(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* HOTEL / ACTIVITY / TRANSIT / DOC INPUTS */
                <>
                  <div>
                    <label className="form-label">
                      {formCategory === 'hotel' && 'Hotel / Accommodation Name *'}
                      {formCategory === 'activity' && 'Activity / Sight Title *'}
                      {formCategory === 'transit' && 'Transit Pass Title *'}
                      {formCategory === 'doc' && 'Document / Pass Title *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        formCategory === 'hotel'
                          ? 'e.g. Hotel Gracery Shinjuku'
                          : formCategory === 'activity'
                          ? 'e.g. Shibuya Sky Observatory Deck'
                          : formCategory === 'transit'
                          ? 'e.g. JR East All-Access Pass'
                          : 'e.g. Japan Visit Web QR Declaration'
                      }
                      className="form-input"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-row-2">
                    <div>
                      <label className="form-label">
                        Confirmation Code / Booking Ref
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. GRAC-88192"
                        className="form-input"
                        value={confirmationCode}
                        onChange={(e) => setConfirmationCode(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Guest / Traveler Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Alex, Group Pass"
                        className="form-input"
                        value={passengerOrGuestName}
                        onChange={(e) => setPassengerOrGuestName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Address or Location</label>
                    <input
                      type="text"
                      placeholder="e.g. 1-19-1 Kabukicho, Shinjuku City"
                      className="form-input"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>

                  <div className="form-row-2">
                    <div>
                      <label className="form-label">
                        {formCategory === 'hotel' ? 'Check-in Date & Time' : 'Date & Time'}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          className="form-input flex-1"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                        />
                        <input
                          type="text"
                          placeholder="15:00"
                          className="form-input w-24"
                          value={time}
                          onChange={(e) => setTime(e.target.value)}
                        />
                      </div>
                    </div>

                    {formCategory === 'hotel' && (
                      <div>
                        <label className="form-label">Check-out Date &amp; Time</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            className="form-input flex-1"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="11:00"
                            className="form-input w-24"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-row-2">
                    <div>
                      <label className="form-label">
                        {formCategory === 'hotel' ? 'Room Category' : 'Pass / Ticket Type'}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Deluxe Double, Fast Pass"
                        className="form-input"
                        value={cabinOrRoomType}
                        onChange={(e) => setCabinOrRoomType(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">
                        {formCategory === 'hotel' ? 'Room Number' : 'Seat / Slot Number'}
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Room 2408"
                        className="form-input"
                        value={seatOrRoomNumber}
                        onChange={(e) => setSeatOrRoomNumber(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="form-label">Important Notes / Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Show voucher barcode at 8th floor desk"
                  className="form-input"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="modal-actions-row mt-3">
                <button
                  type="button"
                  className="secondary-action-btn flex-1"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-modal-btn flex-1">
                  <CheckCircle2 size={15} />
                  <span>Save to Vault</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

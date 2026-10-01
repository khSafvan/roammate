import React, { useState } from 'react';
import { Plane, Search, Loader2, X } from 'lucide-react';
import { Flight } from '../../types/trip';

interface FlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (flight: Flight) => void;
  initialFlight?: Flight;
  travelers?: string[];
}

export const FlightModal: React.FC<FlightModalProps> = ({ isOpen, onClose, onSave, initialFlight, travelers = [] }) => {
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [flightData, setFlightData] = useState<Partial<Flight>>(initialFlight || {});

  if (!isOpen) return null;

  const handleLookup = async () => {
    if (!flightData.flightNumber) return;
    setIsLookingUp(true);
    try {
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/flights/lookup?q=${encodeURIComponent(flightData.flightNumber)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.carrier) {
          setFlightData(prev => ({
            ...prev,
            carrier: data.carrier,
            departure: { ...prev.departure, ...data.departure },
            arrival: { ...prev.arrival, ...data.arrival },
            durationMinutes: data.durationMinutes,
            airplaneType: data.airplaneType,
          }));
        }
      }
    } catch (err) {
      console.error('Flight lookup error', err);
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    onSave({
      id: initialFlight?.id || 'fl_' + Math.random().toString(36).substr(2, 9),
      carrier: formData.get('carrier') as string || flightData.carrier || '',
      flightNumber: formData.get('flightNumber') as string || flightData.flightNumber || '',
      date: formData.get('date') as string || flightData.date || '',
      bookingRef: formData.get('bookingRef') as string || flightData.bookingRef || '',
      passengerName: formData.get('passengerName') as string || flightData.passengerName || '',
      durationMinutes: flightData.durationMinutes,
      airplaneType: flightData.airplaneType,
      departure: {
        airport: formData.get('depAirport') as string || flightData.departure?.airport || '',
        city: flightData.departure?.city || '',
        time: flightData.departure?.time || '',
        terminal: flightData.departure?.terminal || '',
      },
      arrival: {
        airport: formData.get('arrAirport') as string || flightData.arrival?.airport || '',
        city: flightData.arrival?.city || '',
        time: flightData.arrival?.time || '',
        terminal: flightData.arrival?.terminal || '',
      }
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-icon-container">
              <Plane size={18} className="text-blue" />
            </div>
            <div>
              <h3 className="modal-title">{initialFlight ? 'Edit Flight' : 'Add Flight'}</h3>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="modal-body form-grid">
          <div className="form-group full-span" style={{ position: 'relative' }}>
            <label>Flight Number</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                name="flightNumber"
                className="form-input"
                value={flightData.flightNumber || ''}
                onChange={e => setFlightData({ ...flightData, flightNumber: e.target.value })}
                placeholder="e.g. EK1"
                required
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="secondary-action-btn"
                onClick={handleLookup}
                disabled={isLookingUp || !flightData.flightNumber}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {isLookingUp ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
                Lookup
              </button>
            </div>
          </div>
          <div className="form-group">
            <label>Carrier</label>
            <input type="text" name="carrier" className="form-input" value={flightData.carrier || ''} onChange={e => setFlightData({ ...flightData, carrier: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" name="date" className="form-input" value={flightData.date || ''} onChange={e => setFlightData({ ...flightData, date: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Departure Airport Code</label>
            <input type="text" name="depAirport" className="form-input" value={flightData.departure?.airport || ''} onChange={e => setFlightData({ ...flightData, departure: { ...flightData.departure!, airport: e.target.value } })} required />
          </div>
          <div className="form-group">
            <label>Arrival Airport Code</label>
            <input type="text" name="arrAirport" className="form-input" value={flightData.arrival?.airport || ''} onChange={e => setFlightData({ ...flightData, arrival: { ...flightData.arrival!, airport: e.target.value } })} required />
          </div>
          <div className="form-group full-span">
            <label>Traveler / Passenger</label>
            <input
              type="text"
              name="passengerName"
              className="form-input"
              list="flight-travelers-list"
              value={flightData.passengerName || ''}
              onChange={e => setFlightData({ ...flightData, passengerName: e.target.value })}
              placeholder="e.g. John, Jane, or John & Jane"
            />
            <datalist id="flight-travelers-list">
              {travelers.map(t => <option key={t} value={t} />)}
              {travelers.length > 1 && <option value={travelers.join(' & ')} />}
            </datalist>
          </div>
          <div className="form-group full-span">
            <label>Booking Reference (PNR)</label>
            <input type="text" name="bookingRef" className="form-input" value={flightData.bookingRef || ''} onChange={e => setFlightData({ ...flightData, bookingRef: e.target.value })} />
          </div>
          <div className="form-group full-span" style={{ marginTop: '16px' }}>
            <button type="submit" className="primary-action-btn" style={{ width: '100%' }}>Save Flight</button>
          </div>
        </form>
      </div>
    </div>
  );
};

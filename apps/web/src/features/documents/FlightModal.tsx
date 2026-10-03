import React, { useState, useEffect } from 'react';
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
  const [flightData, setFlightData] = useState<Partial<Flight>>({});

  useEffect(() => {
    if (isOpen) {
      setFlightData(initialFlight || {});
      setIsLookingUp(false);
    }
  }, [isOpen, initialFlight]);

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
    onSave({
      id: flightData.id || 'fl_' + Math.random().toString(36).substr(2, 9),
      carrier: flightData.carrier || '',
      flightNumber: flightData.flightNumber || '',
      date: flightData.date || '',
      bookingRef: flightData.bookingRef || '',
      passengerName: flightData.passengerName || '',
      cabinClass: flightData.cabinClass || 'Economy',
      seat: flightData.seat || '',
      durationMinutes: flightData.durationMinutes,
      airplaneType: flightData.airplaneType,
      departure: {
        airport: flightData.departure?.airport || '',
        city: flightData.departure?.city || '',
        time: flightData.departure?.time || '',
        terminal: flightData.departure?.terminal || '',
      },
      arrival: {
        airport: flightData.arrival?.airport || '',
        city: flightData.arrival?.city || '',
        time: flightData.arrival?.time || '',
        terminal: flightData.arrival?.terminal || '',
        nextDay: flightData.arrival?.nextDay
      }
    });
    onClose();
  };

  const updateField = (field: string, value: string) => {
    setFlightData(prev => ({ ...prev, [field]: value }));
  };

  const updateNestedField = (parent: 'departure' | 'arrival', field: string, value: string) => {
    setFlightData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent] || {}),
        [field]: value
      }
    }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
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
                className="form-input"
                value={flightData.flightNumber || ''}
                onChange={e => updateField('flightNumber', e.target.value)}
                placeholder="e.g. EK318"
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
            <input type="text" className="form-input" value={flightData.carrier || ''} onChange={e => updateField('carrier', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" className="form-input" value={flightData.date || ''} onChange={e => updateField('date', e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Dep Airport Code</label>
            <input type="text" className="form-input" value={flightData.departure?.airport || ''} onChange={e => updateNestedField('departure', 'airport', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Arr Airport Code</label>
            <input type="text" className="form-input" value={flightData.arrival?.airport || ''} onChange={e => updateNestedField('arrival', 'airport', e.target.value)} required />
          </div>
          
          <div className="form-group">
            <label>Dep City</label>
            <input type="text" className="form-input" value={flightData.departure?.city || ''} onChange={e => updateNestedField('departure', 'city', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Arr City</label>
            <input type="text" className="form-input" value={flightData.arrival?.city || ''} onChange={e => updateNestedField('arrival', 'city', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Dep Time</label>
            <input type="time" className="form-input" value={flightData.departure?.time || ''} onChange={e => updateNestedField('departure', 'time', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Arr Time</label>
            <input type="time" className="form-input" value={flightData.arrival?.time || ''} onChange={e => updateNestedField('arrival', 'time', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Dep Terminal</label>
            <input type="text" className="form-input" value={flightData.departure?.terminal || ''} onChange={e => updateNestedField('departure', 'terminal', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Arr Terminal</label>
            <input type="text" className="form-input" value={flightData.arrival?.terminal || ''} onChange={e => updateNestedField('arrival', 'terminal', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Cabin Class</label>
            <select className="form-input" value={flightData.cabinClass || 'ECONOMY'} onChange={e => updateField('cabinClass', e.target.value)}>
              <option value="ECONOMY">Economy</option>
              <option value="PREMIUM ECONOMY">Premium Economy</option>
              <option value="BUSINESS">Business</option>
              <option value="FIRST">First Class</option>
            </select>
          </div>
          <div className="form-group">
            <label>Seat</label>
            <input type="text" className="form-input" value={flightData.seat || ''} onChange={e => updateField('seat', e.target.value)} />
          </div>

          <div className="form-group full-span">
            <label>Traveler / Passenger</label>
            <input
              type="text"
              className="form-input"
              list="flight-travelers-list"
              value={flightData.passengerName || ''}
              onChange={e => updateField('passengerName', e.target.value)}
              placeholder="e.g. John, Jane, or John & Jane"
            />
            <datalist id="flight-travelers-list">
              {travelers.map(t => <option key={t} value={t} />)}
              {travelers.length > 1 && <option value={travelers.join(' & ')} />}
            </datalist>
          </div>
          <div className="form-group full-span">
            <label>Booking Reference (PNR)</label>
            <input type="text" className="form-input" value={flightData.bookingRef || ''} onChange={e => updateField('bookingRef', e.target.value)} />
          </div>
          
          <div className="form-group full-span" style={{ marginTop: '16px' }}>
            <button type="submit" className="primary-action-btn" style={{ width: '100%' }}>Save Flight</button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Hotel, X } from 'lucide-react';
import { BookingDocument } from '../../types/trip';
import { PlaceSearchInput, PlaceSearchResult } from '../PlaceSearchInput';

interface HotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: BookingDocument) => void;
  initialHotel?: BookingDocument;
  travelers?: string[];
}

export const HotelModal: React.FC<HotelModalProps> = ({ isOpen, onClose, onSave, initialHotel, travelers = [] }) => {
  const [docData, setDocData] = useState<Partial<BookingDocument>>({});

  useEffect(() => {
    if (isOpen) {
      setDocData(initialHotel || {});
    }
  }, [isOpen, initialHotel]);

  if (!isOpen) return null;

  const handleSelectPlace = (place: PlaceSearchResult) => {
    setDocData(prev => ({
      ...prev,
      title: place.title,
      location: place.address,
      coordinates: place.coordinates,
      rating: place.rating,
      website: place.website,
      phoneNumber: place.phoneNumber,
      placeId: place.placeId,
      time: place.openTime || prev.time || '15:00', // standard check-in
      endTime: place.closeTime || prev.endTime || '11:00', // standard check-out
    }));
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Auto-calculate nights for subtitle
    let nights = undefined;
    if (docData.date && docData.endDate) {
      const ms = new Date(docData.endDate).getTime() - new Date(docData.date).getTime();
      nights = Math.max(1, Math.round(ms / 86400000));
    }
    
    const subtitle = [nights ? `${nights} Night${nights > 1 ? 's' : ''}` : '', docData.cabinOrRoomType].filter(Boolean).join(' · ');

    onSave({
      id: docData.id || 'doc_' + Math.random().toString(36).substr(2, 9),
      category: 'hotel',
      title: docData.title || '',
      subtitle: subtitle || docData.subtitle,
      cabinOrRoomType: docData.cabinOrRoomType || '',
      confirmationCode: docData.confirmationCode || '',
      date: docData.date || '',
      endDate: docData.endDate || '',
      location: docData.location || '',
      passengerOrGuestName: docData.passengerOrGuestName || '',
      coordinates: docData.coordinates,
      rating: docData.rating,
      website: docData.website,
      phoneNumber: docData.phoneNumber,
      placeId: docData.placeId,
      time: docData.time,
      endTime: docData.endTime,
      notes: docData.notes || '',
    });
    onClose();
  };

  const updateField = (field: string, value: string) => {
    setDocData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', overflow: 'visible' }}>
        <div className="modal-header">
          <div className="modal-header-title">
            <div className="modal-icon-container">
              <Hotel size={18} className="text-emerald" />
            </div>
            <div>
              <h3 className="modal-title">{initialHotel ? 'Edit Hotel' : 'Add Hotel'}</h3>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="modal-body form-grid" style={{ overflow: 'visible' }}>
          <div className="form-group full-span" style={{ zIndex: 50 }}>
            <label>Search Hotel (Foursquare / OSM)</label>
            <PlaceSearchInput
              onSelectPlace={handleSelectPlace}
              placeholder="Search hotel name or location..."
            />
          </div>
          
          <div className="form-group full-span">
            <label>Hotel Name</label>
            <input type="text" className="form-input" value={docData.title || ''} onChange={e => updateField('title', e.target.value)} required />
          </div>
          
          <div className="form-group">
            <label>Check-in Date</label>
            <input type="date" className="form-input" value={docData.date || ''} onChange={e => updateField('date', e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Check-out Date</label>
            <input type="date" className="form-input" value={docData.endDate || ''} onChange={e => updateField('endDate', e.target.value)} required />
          </div>

          <div className="form-group">
            <label>Check-in Time</label>
            <input type="time" className="form-input" value={docData.time || ''} onChange={e => updateField('time', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Check-out Time</label>
            <input type="time" className="form-input" value={docData.endTime || ''} onChange={e => updateField('endTime', e.target.value)} />
          </div>

          <div className="form-group full-span">
            <label>Room Type</label>
            <input type="text" className="form-input" value={docData.cabinOrRoomType || ''} onChange={e => updateField('cabinOrRoomType', e.target.value)} placeholder="e.g. Fountain View Deluxe Suite" />
          </div>
          
          <div className="form-group full-span">
            <label>Location / Address</label>
            <input type="text" className="form-input" value={docData.location || ''} onChange={e => updateField('location', e.target.value)} />
          </div>
          
          <div className="form-group full-span">
            <label>Traveler / Guest</label>
            <input
              type="text"
              className="form-input"
              list="hotel-travelers-list"
              value={docData.passengerOrGuestName || ''}
              onChange={e => updateField('passengerOrGuestName', e.target.value)}
              placeholder="e.g. John, Jane, or John & Jane"
            />
            <datalist id="hotel-travelers-list">
              {travelers.map(t => <option key={t} value={t} />)}
              {travelers.length > 1 && <option value={travelers.join(' & ')} />}
            </datalist>
          </div>
          
          <div className="form-group full-span">
            <label>Confirmation Code</label>
            <input type="text" className="form-input" value={docData.confirmationCode || ''} onChange={e => updateField('confirmationCode', e.target.value)} />
          </div>

          <div className="form-group full-span">
            <label>Notes</label>
            <textarea className="form-input" value={docData.notes || ''} onChange={e => updateField('notes', e.target.value)} placeholder="Any special requests or instructions..." rows={2} />
          </div>
          
          <div className="form-group full-span" style={{ marginTop: '16px' }}>
            <button type="submit" className="primary-action-btn" style={{ width: '100%' }}>Save Hotel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

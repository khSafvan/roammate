import React, { useState } from 'react';
import { Hotel, X } from 'lucide-react';
import { BookingDocument, Coordinates } from '../../types/trip';
import { PlaceSearchInput, PlaceSearchResult } from '../PlaceSearchInput';

interface HotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: BookingDocument) => void;
  initialHotel?: BookingDocument;
  travelers?: string[];
}

export const HotelModal: React.FC<HotelModalProps> = ({ isOpen, onClose, onSave, initialHotel, travelers = [] }) => {
  const [docData, setDocData] = useState<Partial<BookingDocument>>(initialHotel || {});

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
    const formData = new FormData(e.currentTarget);
    onSave({
      id: initialHotel?.id || 'doc_' + Math.random().toString(36).substr(2, 9),
      category: 'hotel',
      title: formData.get('title') as string || docData.title || '',
      confirmationCode: formData.get('confirmationCode') as string || docData.confirmationCode || '',
      date: formData.get('date') as string || docData.date || '',
      endDate: formData.get('endDate') as string || docData.endDate || '',
      location: formData.get('location') as string || docData.location || '',
      passengerOrGuestName: formData.get('guestName') as string || docData.passengerOrGuestName || '',
      coordinates: docData.coordinates,
      rating: docData.rating,
      website: docData.website,
      phoneNumber: docData.phoneNumber,
      placeId: docData.placeId,
      time: docData.time,
      endTime: docData.endTime,
    });
    onClose();
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
            <label>Search Hotel</label>
            <PlaceSearchInput
              onSelectPlace={handleSelectPlace}
              placeholder="Search hotel name or location..."
              searchContext="hotel"
            />
          </div>
          <div className="form-group full-span">
            <label>Hotel Name</label>
            <input type="text" name="title" className="form-input" value={docData.title || ''} onChange={e => setDocData({ ...docData, title: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Check-in Date</label>
            <input type="date" name="date" className="form-input" value={docData.date || ''} onChange={e => setDocData({ ...docData, date: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Check-out Date</label>
            <input type="date" name="endDate" className="form-input" value={docData.endDate || ''} onChange={e => setDocData({ ...docData, endDate: e.target.value })} />
          </div>
          <div className="form-group full-span">
            <label>Location / Address</label>
            <input type="text" name="location" className="form-input" value={docData.location || ''} onChange={e => setDocData({ ...docData, location: e.target.value })} />
          </div>
          <div className="form-group full-span">
            <label>Traveler / Guest</label>
            <input
              type="text"
              name="guestName"
              className="form-input"
              list="hotel-travelers-list"
              value={docData.passengerOrGuestName || (travelers.length > 1 ? travelers.join(' & ') : (travelers[0] || 'John & Jane'))}
              onChange={e => setDocData({ ...docData, passengerOrGuestName: e.target.value })}
              placeholder="e.g. John, Jane, or John & Jane"
            />
            <datalist id="hotel-travelers-list">
              {travelers.map(t => <option key={t} value={t} />)}
              {travelers.length > 1 && <option value={travelers.join(' & ')} />}
            </datalist>
          </div>
          <div className="form-group full-span">
            <label>Confirmation Code</label>
            <input type="text" name="confirmationCode" className="form-input" value={docData.confirmationCode || ''} onChange={e => setDocData({ ...docData, confirmationCode: e.target.value })} />
          </div>
          <div className="form-group full-span" style={{ marginTop: '16px' }}>
            <button type="submit" className="primary-action-btn" style={{ width: '100%' }}>Save Hotel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

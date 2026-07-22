import React from 'react';
import { Hotel, X } from 'lucide-react';
import { BookingDocument } from '../../types/trip';

interface HotelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: BookingDocument) => void;
  initialHotel?: BookingDocument;
  travelers?: string[];
}

export const HotelModal: React.FC<HotelModalProps> = ({ isOpen, onClose, onSave, initialHotel, travelers = [] }) => {
  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    onSave({
      id: initialHotel?.id || 'doc_' + Math.random().toString(36).substr(2, 9),
      category: 'hotel',
      title: data.title as string,
      confirmationCode: data.confirmationCode as string,
      date: data.date as string,
      endDate: data.endDate as string,
      location: data.location as string,
      passengerOrGuestName: data.guestName as string,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
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
        <form onSubmit={handleSave} className="modal-body form-grid">
          <div className="form-group full-span">
            <label>Hotel Name</label>
            <input type="text" name="title" className="form-input" defaultValue={initialHotel?.title} required />
          </div>
          <div className="form-group">
            <label>Check-in Date</label>
            <input type="date" name="date" className="form-input" defaultValue={initialHotel?.date} required />
          </div>
          <div className="form-group">
            <label>Check-out Date</label>
            <input type="date" name="endDate" className="form-input" defaultValue={initialHotel?.endDate} />
          </div>
          <div className="form-group full-span">
            <label>Location / Address</label>
            <input type="text" name="location" className="form-input" defaultValue={initialHotel?.location} />
          </div>
          <div className="form-group full-span">
            <label>Traveler / Guest</label>
            <select name="guestName" className="form-input" defaultValue={initialHotel?.passengerOrGuestName}>
              <option value="">Select Guest...</option>
              {travelers.map(t => <option key={t} value={t}>{t}</option>)}
              <option value={travelers.join(' & ')}>Both ({travelers.join(' & ')})</option>
            </select>
          </div>
          <div className="form-group full-span">
            <label>Confirmation Code</label>
            <input type="text" name="confirmationCode" className="form-input" defaultValue={initialHotel?.confirmationCode} />
          </div>
          <div className="form-group full-span" style={{ marginTop: '16px' }}>
            <button type="submit" className="primary-action-btn" style={{ width: '100%' }}>Save Hotel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

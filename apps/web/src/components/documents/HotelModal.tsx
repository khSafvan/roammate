import React, { useState, useEffect } from 'react';
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
  const [title, setTitle] = useState('');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');
  const [guestName, setGuestName] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialHotel) {
        setTitle(initialHotel.title || '');
        setConfirmationCode(initialHotel.confirmationCode || '');
        setDate(initialHotel.date || '');
        setEndDate(initialHotel.endDate || '');
        setLocation(initialHotel.location || '');
        setGuestName(initialHotel.passengerOrGuestName || '');
      } else {
        setTitle(''); setConfirmationCode(''); setDate(''); setEndDate(''); setLocation(''); setGuestName('');
      }
    }
  }, [isOpen, initialHotel]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialHotel?.id || 'doc_' + Math.random().toString(36).substr(2, 9),
      category: 'hotel',
      title,
      confirmationCode,
      date,
      endDate,
      location,
      passengerOrGuestName: guestName,
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
            <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Check-in Date</label>
            <input type="date" className="form-input" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Check-out Date</label>
            <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div className="form-group full-span">
            <label>Location / Address</label>
            <input type="text" className="form-input" value={location} onChange={e => setLocation(e.target.value)} />
          </div>
          <div className="form-group full-span">
            <label>Traveler / Guest</label>
            <select className="form-input" value={guestName} onChange={e => setGuestName(e.target.value)}>
              <option value="">Select Guest...</option>
              {travelers.map(t => <option key={t} value={t}>{t}</option>)}
              <option value={travelers.join(' & ')}>Both ({travelers.join(' & ')})</option>
            </select>
          </div>
          <div className="form-group full-span">
            <label>Confirmation Code</label>
            <input type="text" className="form-input" value={confirmationCode} onChange={e => setConfirmationCode(e.target.value)} />
          </div>
          <div className="form-group full-span" style={{ marginTop: '16px' }}>
            <button type="submit" className="primary-action-btn" style={{ width: '100%' }}>Save Hotel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Ticket, X } from 'lucide-react';
import { BookingDocument } from '../../types/trip';
import { PlaceSearchInput, PlaceSearchResult } from '../PlaceSearchInput';

interface ActivityPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (doc: BookingDocument) => void;
  initialDoc?: BookingDocument;
}

export const ActivityPassModal: React.FC<ActivityPassModalProps> = ({ isOpen, onClose, onSave, initialDoc }) => {
  const [docData, setDocData] = useState<Partial<BookingDocument>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDocData(initialDoc || {});
      setShowAdvanced(false);
    }
  }, [isOpen, initialDoc]);

  if (!isOpen) return null;

  const handleSelectPlace = (place: PlaceSearchResult) => {
    setDocData(prev => ({
      ...prev,
      title: place.title,
      subtitle: place.subtitle,
      location: place.address,
      coordinates: place.coordinates,
      rating: place.rating,
      website: place.website,
      phoneNumber: place.phoneNumber,
      placeId: place.placeId,
      time: place.openTime || prev.time,
    }));
    setShowAdvanced(false);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSave({
      id: docData.id || 'doc_' + Math.random().toString(36).substr(2, 9),
      category: docData.category || 'activity',
      title: docData.title || '',
      subtitle: docData.subtitle || '',
      confirmationCode: docData.confirmationCode || '',
      date: docData.date || '',
      time: docData.time || '',
      location: docData.location || '',
      passengerOrGuestName: docData.passengerOrGuestName || '',
      coordinates: docData.coordinates,
      rating: docData.rating,
      website: docData.website,
      phoneNumber: docData.phoneNumber,
      placeId: docData.placeId,
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
            <div className="modal-icon-container" style={{ background: 'var(--bg-subtle)' }}>
              <Ticket size={18} className="text-purple" />
            </div>
            <div>
              <h3 className="modal-title">{initialDoc ? 'Edit Booking' : 'Add Activity / Generic Booking'}</h3>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} style={{ minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
        </div>
        <form onSubmit={handleSave} className="modal-body form-grid" style={{ overflow: 'visible' }}>
          <div className="form-group full-span" style={{ zIndex: 50 }}>
            <label>Search Venue or Activity (Google Places / TripAdvisor)</label>
            <PlaceSearchInput
              onSelectPlace={handleSelectPlace}
              placeholder="Search activity, restaurant, or location..."
            />
          </div>
          
          {docData.title && !showAdvanced ? (
            <div className="full-span" style={{ padding: '16px', backgroundColor: 'var(--bg-subtle)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginTop: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '24px' }}>🎟️</span>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>{docData.title}</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                      {docData.location || docData.subtitle}
                    </p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setShowAdvanced(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--brand-blue)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', padding: '8px', minHeight: '44px' }}
                >
                  Edit Details
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="form-group full-span">
                <label>Title</label>
                <input type="text" className="form-input" value={docData.title || ''} onChange={e => updateField('title', e.target.value)} required />
              </div>
              
              <div className="form-group full-span">
                <label>Description / Subtitle</label>
                <input type="text" className="form-input" value={docData.subtitle || ''} onChange={e => updateField('subtitle', e.target.value)} />
              </div>

              <div className="form-group">
                <label>Date</label>
                <input type="date" className="form-input" value={docData.date || ''} onChange={e => updateField('date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Time</label>
                <input type="time" className="form-input" value={docData.time || ''} onChange={e => updateField('time', e.target.value)} />
              </div>

              <div className="form-group full-span">
                <label>Location / Address</label>
                <input type="text" className="form-input" value={docData.location || ''} onChange={e => updateField('location', e.target.value)} />
              </div>
              
              <div className="form-group">
                <label>Category</label>
                <select className="form-input" value={docData.category || 'activity'} onChange={e => updateField('category', e.target.value)}>
                  <option value="activity">Activity / Tour</option>
                  <option value="doc">Generic Ticket / Pass</option>
                  <option value="transit">Transit Ticket</option>
                </select>
              </div>
              <div className="form-group">
                <label>Confirmation Code</label>
                <input type="text" className="form-input" value={docData.confirmationCode || ''} onChange={e => updateField('confirmationCode', e.target.value)} />
              </div>

              <div className="form-group full-span">
                <label>Notes</label>
                <textarea className="form-input" value={docData.notes || ''} onChange={e => updateField('notes', e.target.value)} rows={2} />
              </div>
            </>
          )}
          
          <div className="form-group full-span" style={{ marginTop: '16px' }}>
            <button type="submit" className="primary-action-btn" style={{ width: '100%', minHeight: '44px' }}>Save Booking</button>
          </div>
        </form>
      </div>
    </div>
  );
};

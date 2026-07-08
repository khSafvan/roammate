import React from 'react';
import { FolderHeart, X } from 'lucide-react';
import { useModalA11y } from '../../hooks';

export interface WardrobeItem {
  imageUrl: string;
  label?: string;
  sourceEventId?: string;
}

export interface WardrobePickerModalProps {
  isOpen: boolean;
  travelerName: string;
  wardrobeItems?: WardrobeItem[];
  items?: WardrobeItem[];
  onSelect: (item: WardrobeItem) => void;
  onClose: () => void;
}

export const WardrobePickerModal: React.FC<WardrobePickerModalProps> = ({
  isOpen,
  travelerName,
  wardrobeItems,
  items,
  onSelect,
  onClose,
}) => {
  useModalA11y(isOpen, onClose);

  const displayedItems = wardrobeItems || items || [];

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '520px', width: '100%' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wardrobe-picker-title"
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="stop-badge-lg" style={{ backgroundColor: 'var(--brand-purple, #8B5CF6)' }}>
              <FolderHeart size={18} />
            </div>
            <div>
              <h2 id="wardrobe-picker-title" className="modal-title">
                Wardrobe · {travelerName}
              </h2>
              <p className="modal-subtitle">
                Select an outfit from previous days or events for {travelerName}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '16px 0' }}>
          {displayedItems.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '36px 16px',
                color: 'var(--text-tertiary, #94a3b8)',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>👔</div>
              <p style={{ fontSize: '13px', margin: '0 0 6px 0', fontWeight: 600, color: 'var(--text-primary)' }}>
                No saved looks found
              </p>
              <p style={{ fontSize: '12px', margin: 0, lineHeight: 1.4 }}>
                Upload photos for {travelerName} on any day to build their reusable wardrobe gallery.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: '12px',
                padding: '0 4px',
              }}
            >
              {displayedItems.map((item, idx) => (
                <div
                  key={`${item.imageUrl}-${idx}`}
                  onClick={() => {
                    onSelect(item);
                    onClose();
                  }}
                  style={{
                    border: '1px solid var(--border-light, #e2e8f0)',
                    borderRadius: 'var(--radius-card, 12px)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    backgroundColor: 'var(--bg-card, #ffffff)',
                    boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                  title={item.label || `Select this look for ${travelerName}`}
                >
                  <div
                    style={{
                      height: '130px',
                      backgroundColor: 'var(--bg-subtle, #f8fafc)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.label || `${travelerName}'s outfit`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      loading="lazy"
                    />
                  </div>
                  <div style={{ padding: '8px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-primary, #0f172a)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {item.label || 'Saved Outfit'}
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 500,
                        color: 'var(--brand-purple, #8B5CF6)',
                        marginTop: '4px',
                      }}
                    >
                      Choose Look &rarr;
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border-light, #e2e8f0)', paddingTop: '12px' }}>
          <button type="button" className="btn-secondary btn-sm" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Download, Eye, EyeOff, X } from 'lucide-react';
import { useModalA11y } from '../../hooks';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  personName: string;
  originalUrl?: string;
  cutoutUrl?: string;
  defaultUseCutout?: boolean;
  label?: string;
  outfitTitle?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({
  isOpen,
  onClose,
  personName,
  originalUrl,
  cutoutUrl,
  defaultUseCutout = true,
  label,
  outfitTitle,
}) => {
  const [showCutout, setShowCutout] = useState<boolean>(
    Boolean(cutoutUrl && defaultUseCutout)
  );

  useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  const currentSrc = showCutout ? cutoutUrl || originalUrl : originalUrl || cutoutUrl;

  const handleDownload = async () => {
    if (!currentSrc) return;
    try {
      const res = await fetch(currentSrc);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${personName.toLowerCase().replace(/\s+/g, '_')}_outfit.webp`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(currentSrc, '_blank');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card image-preview-modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '95%' }}
      >
        <div className="modal-header">
          <div className="modal-header-left">
            <h3 className="modal-title">
              {personName}&apos;s Outfit Preview
            </h3>
            {outfitTitle && (
              <p className="modal-subtitle">
                {outfitTitle} {label ? `• ${label}` : ''}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {cutoutUrl && originalUrl && (
              <button
                type="button"
                className={`slot-action-btn ${showCutout ? 'active-toggle' : ''}`}
                onClick={() => setShowCutout(!showCutout)}
              >
                {showCutout ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showCutout ? 'Show Original' : 'Show Cutout'}</span>
              </button>
            )}

            {currentSrc && (
              <button
                type="button"
                className="slot-action-btn"
                onClick={handleDownload}
                title="Download photo"
              >
                <Download size={13} />
                <span>Save</span>
              </button>
            )}

            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Big Preview Stage */}
        <div
          className="preview-stage-container"
          style={{
            minHeight: '360px',
            maxHeight: '65vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: showCutout
              ? 'radial-gradient(circle at center, rgba(99, 102, 241, 0.08) 0%, rgba(248, 250, 252, 0.95) 70%)'
              : '#0f172a',
            borderRadius: '12px',
            overflow: 'hidden',
            padding: '20px',
          }}
        >
          {currentSrc ? (
            <img
              src={currentSrc}
              alt={label || `${personName}'s outfit`}
              style={{
                maxWidth: '100%',
                maxHeight: '60vh',
                objectFit: 'contain',
                filter: showCutout ? 'drop-shadow(0 14px 28px rgba(0,0,0,0.22))' : 'none',
                borderRadius: showCutout ? '4px' : '8px',
              }}
            />
          ) : (
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>No photo available</span>
          )}
        </div>

        {label && (
          <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {label}
          </div>
        )}
      </div>
    </div>
  );
};

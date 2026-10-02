import React from 'react';
import { X } from 'lucide-react';
import { useModalA11y } from '../../hooks';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  className = '',
  contentClassName = '',
}) => {
  useModalA11y(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal-card ${className}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {/* Header */}
        {(title || icon) ? (
          <div className="modal-header">
            <div className="modal-header-left">
              {icon && icon}
              <div>
                {title && <h2 id="modal-title" className="modal-title">{title}</h2>}
                {subtitle && <p className="modal-subtitle">{subtitle}</p>}
              </div>
            </div>
            <button className="modal-close-btn flex items-center justify-center min-h-tap" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        ) : (
          <div className="flex justify-end p-2 pb-0">
            <button className="modal-close-btn flex items-center justify-center min-h-tap" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className={`modal-content ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

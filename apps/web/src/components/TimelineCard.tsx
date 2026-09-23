import React, { useEffect, useRef, useState } from 'react';
import {
  BedDouble,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Edit2,
  Eye,
  FileCheck2,
  FileText,
  GripVertical,
  Landmark,
  Lock,
  MapPin,
  MoreVertical,
  Pin,
  Plane,
  QrCode,
  Shirt,
  Star,
  Trash2,
  UtensilsCrossed,
} from 'lucide-react';
import { Look } from '@roammate/shared';
import { ItineraryStop, StopCategory } from '../types/trip';
import { MarkdownText } from './MarkdownText';

interface TimelineCardProps {
  stop: ItineraryStop;
  themeColor: string;
  isSelected?: boolean;
  index?: number;
  totalStops?: number;
  look?: Look;
  onSelect: (stop: ItineraryStop) => void;
  onEdit?: (stop: ItineraryStop) => void;
  onDeleteStop?: (stopId: string) => void;
  onContextMenu?: (e: React.MouseEvent, stop: ItineraryStop) => void;
  onMoveUp?: (index: number) => void;
  onMoveDown?: (index: number) => void;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  isDragging?: boolean;
  isDragOver?: boolean;
}

const getCategoryIcon = (category: StopCategory) => {
  switch (category) {
    case 'flight':
      return <Plane size={15} strokeWidth={1.75} />;
    case 'lodging':
      return <BedDouble size={15} strokeWidth={1.75} />;
    case 'sight':
      return <Landmark size={15} strokeWidth={1.75} />;
    case 'dining':
      return <UtensilsCrossed size={15} strokeWidth={1.75} />;
    case 'note':
      return <FileText size={15} strokeWidth={1.75} />;
    default:
      return <Compass size={15} strokeWidth={1.75} />;
  }
};

export const TimelineCard = React.memo<TimelineCardProps>(function TimelineCard({
  stop,
  isSelected,
  index,
  totalStops,
  look,
  onSelect,
  onEdit,
  onDeleteStop,
  onContextMenu,
  onMoveUp,
  onMoveDown,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDragEnd,
  onDrop,
  isDragging,
  isDragOver,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const isFixedAnchor = Boolean(stop.isAnchor);

  const reorderControls = !isFixedAnchor && totalStops && totalStops > 1 ? (
    <div className="card-reorder-actions" onClick={(e) => e.stopPropagation()}>
      <span className="card-drag-grip" title="Drag to reorder" aria-label="Drag handle">
        <GripVertical size={13} />
      </span>
      {typeof index === 'number' && index > 0 && onMoveUp && (
        <button
          type="button"
          className="reorder-arrow-btn"
          onClick={(e) => { e.stopPropagation(); onMoveUp?.(index); }}
          title="Move stop earlier"
          aria-label="Move stop earlier"
        >
          <ChevronUp size={12} />
        </button>
      )}
      {typeof index === 'number' && index < totalStops - 1 && onMoveDown && (
        <button
          type="button"
          className="reorder-arrow-btn"
          onClick={(e) => { e.stopPropagation(); onMoveDown?.(index); }}
          title="Move stop later"
          aria-label="Move stop later"
        >
          <ChevronDown size={12} />
        </button>
      )}
    </div>
  ) : null;

  if (stop.category === 'note') {
    return (
      <div
        className={`timeline-item-wrapper timeline-note-wrapper ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
        draggable={!isFixedAnchor && Boolean(totalStops && totalStops > 1)}
        onDragStart={(e) => onDragStart?.(e, index!)}
        onDragOver={(e) => onDragOver?.(e, index!)}
        onDragLeave={onDragLeave}
        onDragEnd={onDragEnd}
        onDrop={(e) => onDrop?.(e, index!)}
      >
        <div
          className={`timeline-card is-note-card ${isSelected ? 'is-selected' : ''}`}
          onClick={() => onSelect(stop)}
          onContextMenu={(e) => {
            if (onContextMenu) {
              e.preventDefault();
              onContextMenu(e, stop);
            }
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(stop);
            }
          }}
        >
          <div className="timeline-card-content">
            <div className="category-node node-note" title="TRAVEL NOTE & ADVISORY">
              <FileText size={15} strokeWidth={1.75} />
            </div>
            <div className="card-body">
              <div className="card-meta-line">
                {reorderControls}
                <span className="card-category-sublabel note-label">💡 Note &amp; Travel Tip</span>
                {isFixedAnchor && (
                  <span className="card-fixed-pill" title="Immovable Boundary Location">
                    <Pin size={10} strokeWidth={2} />
                    <span>Fixed Pin</span>
                  </span>
                )}
                {onEdit && (
                  <button
                    type="button"
                    className="card-edit-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(stop);
                    }}
                    title="Edit note"
                  >
                    <Edit2 size={12} strokeWidth={2} />
                  </button>
                )}
              </div>
              {stop.title && stop.title !== 'Note' && <h3 className="card-title">{stop.title}</h3>}
              <div className="card-notes-preview is-standalone">
                <MarkdownText text={stop.notes || stop.subtitle} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`timeline-item-wrapper ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
      draggable={!isFixedAnchor && Boolean(totalStops && totalStops > 1)}
      onDragStart={(e) => onDragStart?.(e, index!)}
      onDragOver={(e) => onDragOver?.(e, index!)}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop?.(e, index!)}
    >
      {/* Main Modular Card Container */}
      <div
        className={`timeline-card ${isSelected ? 'is-selected' : ''}`}
        onClick={() => onSelect(stop)}
        onContextMenu={(e) => {
          if (onContextMenu) {
            e.preventDefault();
            onContextMenu(e, stop);
          }
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(stop);
          }
        }}
      >
        <div className="timeline-card-content">
          <div className={`category-node node-${stop.category}`} title={stop.category.toUpperCase()}>
            {getCategoryIcon(stop.category)}
          </div>
          <div className="card-body">
            {/* Top Line: Sequence, Time, Duration & Ticket Pill */}
            <div className="card-meta-line">
              <span className="card-order-pill">
                #{String(stop.orderIndex).padStart(2, '0')}
              </span>
              {reorderControls}
              <span className="card-time">{stop.startTime}</span>

              <span className="card-category-sublabel">
                {stop.category}
              </span>

              {isFixedAnchor && (
                <span className="card-fixed-pill" title="Fixed Boundary Location (Non-draggable)">
                  <Pin size={10} strokeWidth={2} />
                  <span>Fixed Base</span>
                </span>
              )}

              {stop.durationMinutes > 0 && (
                <span className="card-duration-pill">
                  <Clock size={10} strokeWidth={1.75} />
                  <span>{stop.durationMinutes}m</span>
                </span>
              )}

              {stop.isFixedTime && (
                <span className="card-fixed-pill" title="Locked reservation time">
                  <Lock size={10} strokeWidth={2} />
                  <span>Fixed</span>
                </span>
              )}

              {stop.openTime && stop.closeTime && (
                <span className="card-hours-pill" title={`Open ${stop.openTime} – ${stop.closeTime}`}>
                  {stop.openTime}–{stop.closeTime}
                </span>
              )}

              {stop.hasTicket && (
                <span className="card-ticket-pill">
                  <FileCheck2 size={11} strokeWidth={1.75} />
                  <span>Ticket Ready</span>
                </span>
              )}

              {/* Indicator Chips (Note, Looks, Tickets) */}
              <div className="card-indicator-chips">
                {stop.notes && (
                  <span className="card-chip chip-note" title="Note attached">
                    <FileText size={10} />
                    <span>Note</span>
                  </span>
                )}

                {look && (
                  <span className="card-chip chip-look" title="Coordinated look planned">
                    <Shirt size={10} />
                    <span>Outfits</span>
                    {(look.person1Cutout || look.person2Cutout || look.person1Original || look.person2Original) && (
                      <span className="chip-avatar-pair">
                        {(look.person1Cutout || look.person1Original) && (
                          <img
                            src={look.person1Cutout || look.person1Original}
                            alt=""
                            className="chip-mini-avatar"
                          />
                        )}
                        {(look.person2Cutout || look.person2Original) && (
                          <img
                            src={look.person2Cutout || look.person2Original}
                            alt=""
                            className="chip-mini-avatar"
                          />
                        )}
                      </span>
                    )}
                  </span>
                )}

                {stop.hasTicket && (
                  <span className="card-chip chip-ticket" title="Ticket ready">
                    <FileCheck2 size={10} />
                    <span>Ticket</span>
                  </span>
                )}

                {typeof stop.rating === 'number' && (
                  <span className="place-rating-badge" title="Rating">
                    <Star size={11} className="fill-amber text-amber" />
                    <span>{stop.rating.toFixed(1)}</span>
                  </span>
                )}
              </div>

              {/* Card Options Ellipsis Dropdown */}
              <div ref={menuRef} className="card-more-menu-wrapper" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="card-more-menu-btn"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  title="More actions"
                  aria-label="More actions"
                  aria-expanded={isMenuOpen}
                >
                  <MoreVertical size={13} />
                </button>

                {isMenuOpen && (
                  <div className="card-dropdown-menu">
                    <button
                      type="button"
                      className="card-dropdown-item"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onSelect(stop);
                      }}
                    >
                      <Eye size={12} />
                      <span>View Details &amp; Outfits</span>
                    </button>

                    {onEdit && (
                      <button
                        type="button"
                        className="card-dropdown-item"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onEdit(stop);
                        }}
                      >
                        <Edit2 size={12} />
                        <span>Edit Place</span>
                      </button>
                    )}

                    {onDeleteStop && (
                      <button
                        type="button"
                        className="card-dropdown-item danger-item"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onDeleteStop(stop.id);
                        }}
                      >
                        <Trash2 size={12} />
                        <span>Delete Place</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Primary Label / Title & Subtitle */}
            <h3 className="card-title">{stop.title}</h3>
            {stop.subtitle && <p className="card-subtitle">{stop.subtitle}</p>}

            {/* Note Snippet on Card */}
            {stop.notes && (
              <div className="card-note-snippet" title={stop.notes}>
                <span className="card-note-snippet-prefix">💡 Note:</span>
                <span className="card-note-snippet-text">
                  {stop.notes.length > 85 ? `${stop.notes.slice(0, 85)}...` : stop.notes}
                </span>
              </div>
            )}

            {/* Secondary Footer Metadata & Details Cue */}
            <div className="card-footer-line">
              <div className="card-address">
                <MapPin size={12} strokeWidth={1.75} />
                <span>{(stop.address || '').split(',')[0] || 'Location pending'}</span>
              </div>

              {/* Stable Slot Pair: Scannable + Ticket/Ref (ticket horizontal position never shifts) */}
              {(stop.bookingRef || stop.hasTicket) && (
                <div className="card-stable-ticket-slot-group">
                  <span
                    className={`card-slot-scannable ${stop.hasTicket ? 'has-item' : 'is-empty'}`}
                    title={stop.hasTicket ? 'Scannable barcode / QR ticket available' : undefined}
                  >
                    {stop.hasTicket ? <QrCode size={13} className="scannable-icon" /> : null}
                  </span>
                  <span className={`card-slot-ticket-num ${stop.bookingRef ? 'has-item' : 'is-empty'}`}>
                    {stop.bookingRef ? `Ticket #${stop.bookingRef}` : ''}
                  </span>
                </div>
              )}

              <span className="card-view-detail-hint">
                View Details &rarr;
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

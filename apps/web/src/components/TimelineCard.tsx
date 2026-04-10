import React from 'react';
import {
  BedDouble,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Edit2,
  FileCheck2,
  FileText,
  GripVertical,
  Landmark,
  Lock,
  MapPin,
  Plane,
  UtensilsCrossed,
} from 'lucide-react';
import { ItineraryStop, StopCategory } from '../types/trip';
import { MarkdownText } from './MarkdownText';

interface TimelineCardProps {
  stop: ItineraryStop;
  themeColor: string;
  isSelected?: boolean;
  index?: number;
  totalStops?: number;
  onSelect: (stop: ItineraryStop) => void;
  onEdit?: (stop: ItineraryStop) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
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
  onSelect,
  onEdit,
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
  const reorderControls = totalStops && totalStops > 1 ? (
    <div className="card-reorder-actions" onClick={(e) => e.stopPropagation()}>
      <span className="card-drag-grip" title="Drag to reorder" aria-label="Drag handle">
        <GripVertical size={13} />
      </span>
      {typeof index === 'number' && index > 0 && onMoveUp && (
        <button
          type="button"
          className="reorder-arrow-btn"
          onClick={onMoveUp}
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
          onClick={onMoveDown}
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
        draggable={Boolean(totalStops && totalStops > 1)}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDragEnd={onDragEnd}
        onDrop={onDrop}
      >
        <div className="category-node node-note" title="NOTE">
          <FileText size={15} strokeWidth={1.75} />
        </div>
        <div
          className={`timeline-card is-note-card ${isSelected ? 'is-selected' : ''}`}
          onClick={() => onSelect(stop)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(stop);
            }
          }}
        >
          <div className="card-body">
            <div className="card-meta-line">
              <span className="card-order-pill">#{String(stop.orderIndex).padStart(2, '0')}</span>
              {reorderControls}
              <span className="card-time">{stop.startTime}</span>
              <span className="card-category-sublabel note-label">Note &amp; Tips</span>
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
    );
  }

  return (
    <div
      className={`timeline-item-wrapper ${isDragging ? 'is-dragging' : ''} ${isDragOver ? 'is-drag-over' : ''}`}
      draggable={Boolean(totalStops && totalStops > 1)}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
    >
      {/* Category Node Anchored on the Sequential Axis */}
      <div className={`category-node node-${stop.category}`} title={stop.category.toUpperCase()}>
        {getCategoryIcon(stop.category)}
      </div>

      {/* Main Modular Card Container */}
      <div
        className={`timeline-card ${isSelected ? 'is-selected' : ''}`}
        onClick={() => onSelect(stop)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(stop);
          }
        }}
      >
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

            {onEdit && (
              <button
                type="button"
                className="card-edit-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(stop);
                }}
                title="Edit stop details"
                aria-label={`Edit ${stop.title}`}
              >
                <Edit2 size={12} strokeWidth={2} />
              </button>
            )}
          </div>

          {/* Primary Label / Title & Subtitle */}
          <h3 className="card-title">{stop.title}</h3>
          {stop.subtitle && <p className="card-subtitle">{stop.subtitle}</p>}

          {/* Rich Markdown Notes for this Location */}
          {stop.notes && (
            <div className="card-notes-preview">
              <MarkdownText text={stop.notes} />
            </div>
          )}

          {/* Secondary Footer Metadata */}
          <div className="card-footer-line">
            <div className="card-address">
              <MapPin size={12} strokeWidth={1.75} />
              <span>{(stop.address || '').split(',')[0] || 'Location pending'}</span>
            </div>

            {stop.bookingRef && (
              <span className="card-ref-badge">REF: {stop.bookingRef}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

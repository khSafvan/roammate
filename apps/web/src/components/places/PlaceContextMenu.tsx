import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  ChevronRight,
  ExternalLink,
  Eye,
  FileText,
  Lightbulb,
  MapPin,
  Shirt,
  Trash2,
} from 'lucide-react';
import { ItineraryStop, TripDay } from '@mojolog/shared';

export interface PlaceContextMenuProps {
  x: number;
  y: number;
  stop: ItineraryStop;
  currentDayId: string;
  days: TripDay[];
  onClose: () => void;
  onViewDetails: (stop: ItineraryStop) => void;
  onPlanOutfits?: (stop: ItineraryStop) => void;
  onEditNote?: (stop: ItineraryStop) => void;
  onMoveToDay: (stopId: string, targetDayId: string) => void;
  onMoveToIdeas: (stop: ItineraryStop) => void;
  onDeleteStop: (stopId: string) => void;
}

export const PlaceContextMenu: React.FC<PlaceContextMenuProps> = ({
  x,
  y,
  stop,
  currentDayId,
  days,
  onClose,
  onViewDetails,
  onPlanOutfits,
  onEditNote,
  onMoveToDay,
  onMoveToIdeas,
  onDeleteStop,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showMoveSubmenu, setShowMoveSubmenu] = useState(false);
  const [position, setPosition] = useState({ top: y, left: x });

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust positioning to stay within viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedLeft = x;
      let adjustedTop = y;

      if (x + rect.width > viewportWidth - 10) {
        adjustedLeft = Math.max(10, viewportWidth - rect.width - 10);
      }
      if (y + rect.height > viewportHeight - 10) {
        adjustedTop = Math.max(10, viewportHeight - rect.height - 10);
      }

      setPosition({ top: adjustedTop, left: adjustedLeft });
    }
  }, [x, y]);

  const mapsUrl = stop.coordinates
    ? `https://www.google.com/maps/search/?api=1&query=${stop.coordinates.latitude},${stop.coordinates.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address || stop.title)}`;

  return (
    <div
      ref={menuRef}
      className="place-context-menu"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="context-menu-header">
        <MapPin size={12} className="context-header-icon" />
        <span className="context-header-title" title={stop.title}>
          {stop.title}
        </span>
      </div>

      <div className="context-menu-divider" />

      {/* Primary Actions */}
      <button
        type="button"
        className="context-menu-item"
        onClick={() => {
          onViewDetails(stop);
          onClose();
        }}
      >
        <Eye size={14} className="context-item-icon" />
        <span>View Details</span>
      </button>

      {onEditNote && (
        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onEditNote(stop);
            onClose();
          }}
        >
          <FileText size={14} className="context-item-icon" />
          <span>{stop.notes ? 'Edit Note' : 'Add Note'}</span>
        </button>
      )}

      {onPlanOutfits && (
        <button
          type="button"
          className="context-menu-item"
          onClick={() => {
            onPlanOutfits(stop);
            onClose();
          }}
        >
          <Shirt size={14} className="context-item-icon" />
          <span>Plan Outfits</span>
        </button>
      )}

      {/* Move To Submenu Trigger */}
      <div
        className="context-menu-item-with-submenu"
        onMouseEnter={() => setShowMoveSubmenu(true)}
        onMouseLeave={() => setShowMoveSubmenu(false)}
      >
        <div className="context-menu-item">
          <Calendar size={14} className="context-item-icon" />
          <span style={{ flex: 1 }}>Move Place To...</span>
          <ChevronRight size={13} className="context-item-arrow" />
        </div>

        {showMoveSubmenu && (
          <div className="context-submenu">
            <div className="context-submenu-title">Select Destination</div>
            {days.map((day) => {
              const isCurrent = day.id === currentDayId;
              return (
                <button
                  key={day.id}
                  type="button"
                  className={`context-menu-item ${isCurrent ? 'disabled' : ''}`}
                  disabled={isCurrent}
                  onClick={() => {
                    if (!isCurrent) {
                      onMoveToDay(stop.id, day.id);
                      onClose();
                    }
                  }}
                >
                  <Calendar size={13} className="context-item-icon" />
                  <span style={{ flex: 1 }}>Day {day.dayNumber}</span>
                  {isCurrent && <span className="current-badge">Current</span>}
                </button>
              );
            })}
            <div className="context-menu-divider" />
            <button
              type="button"
              className="context-menu-item"
              onClick={() => {
                onMoveToIdeas(stop);
                onClose();
              }}
            >
              <Lightbulb size={13} className="context-item-icon" />
              <span>Ideas Bucket</span>
            </button>
          </div>
        )}
      </div>

      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="context-menu-item"
        onClick={() => onClose()}
      >
        <ExternalLink size={14} className="context-item-icon" />
        <span>Open in Google Maps</span>
      </a>

      <div className="context-menu-divider" />

      {/* Danger Action */}
      <button
        type="button"
        className="context-menu-item danger"
        onClick={() => {
          onDeleteStop(stop.id);
          onClose();
        }}
      >
        <Trash2 size={14} className="context-item-icon" />
        <span>Delete from Day</span>
      </button>
    </div>
  );
};

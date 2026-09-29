import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Cloud, CloudRain, CloudSun, Lightbulb, Plus, Sun } from 'lucide-react';
import { TripDay, WeatherCondition } from '../types/trip';
import { tripDayToIso } from '../utils/weatherService';

interface DaySelectorProps {
  days: TripDay[];
  activeDayIndex: number;
  onSelectDay: (index: number) => void;
  onAddDay?: () => void;
  placesCount?: number;
  isPlacesActive?: boolean;
  onSelectPlaces?: () => void;
  holidaysByDate?: Record<string, string>;
  tripStartDate?: string;
}

const getWeatherIcon = (condition: WeatherCondition, size = 13) => {
  switch (condition) {
    case 'sunny':
    case 'clear':
      return <Sun size={size} strokeWidth={1.75} className="text-amber" />;
    case 'partly_cloudy':
      return <CloudSun size={size} strokeWidth={1.75} className="text-amber" />;
    case 'rainy':
      return <CloudRain size={size} strokeWidth={1.75} className="text-blue" />;
    case 'cloudy':
    default:
      return <Cloud size={size} strokeWidth={1.75} className="text-slate" />;
  }
};

export const DaySelector = React.memo<DaySelectorProps>(function DaySelector({
  days,
  activeDayIndex,
  onSelectDay,
  onAddDay,
  placesCount = 0,
  isPlacesActive = false,
  onSelectPlaces,
  holidaysByDate,
  tripStartDate,
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;

    el.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [checkScroll, days.length]);

  useEffect(() => {
    if (scrollRef.current) {
      const activeTab = scrollRef.current.querySelector('.day-tab-pill.active');
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [activeDayIndex, isPlacesActive]);

  const handleScroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = 260;
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  };

  return (
    <div className="day-selector-container">
      {canScrollLeft && (
        <button
          type="button"
          className="day-scroll-arrow-btn left"
          onClick={() => handleScroll('left')}
          title="Scroll Left"
          aria-label="Scroll left"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      <div
        className={`day-selector-scroll ${canScrollLeft ? 'has-left-shadow' : ''} ${canScrollRight ? 'has-right-shadow' : ''}`}
        ref={scrollRef}
        role="tablist"
        aria-label="Trip days"
      >
        {/* Unassigned Places to Visit (Ideas Bucket) Tab */}
        {onSelectPlaces && (
          <button
            type="button"
            role="tab"
            aria-selected={isPlacesActive}
            className={`day-tab-pill ${isPlacesActive ? 'active' : ''}`}
            onClick={onSelectPlaces}
            title="Unassigned Ideas / Places to Visit bucket"
            style={{
              '--day-theme-color': '#D97706',
              '--day-theme-bg': 'rgba(245, 158, 11, 0.12)',
            } as React.CSSProperties}
          >
            <span
              className="day-color-dot"
              style={{ backgroundColor: '#D97706' }}
            />
            <div className="day-info-stack">
              <span className="day-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Lightbulb size={12} style={{ color: '#D97706' }} />
                <span>Places to Visit</span>
              </span>
              <span className="day-date">{placesCount} idea{placesCount === 1 ? '' : 's'}</span>
            </div>
          </button>
        )}

        {days.map((day, idx) => {
          const isActive = !isPlacesActive && idx === activeDayIndex;
          const iso = tripStartDate ? tripDayToIso(tripStartDate, idx) : undefined;
          const holidayName = iso && holidaysByDate ? holidaysByDate[iso] : undefined;

          return (
            <button
              key={day.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`day-tab-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectDay(idx)}
              title={holidayName ? `Public Holiday: ${holidayName}` : undefined}
              style={{
                '--day-theme-color': day.themeColor,
                '--day-theme-bg': `${day.themeColor}14`,
              } as React.CSSProperties}
            >
              <span
                className="day-color-dot"
                style={{ backgroundColor: day.themeColor }}
              />
              <div className="day-info-stack">
                <span className="day-title" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>Day {day.dayNumber}</span>
                  {holidayName && <span className="day-holiday-dot" title={holidayName}>🎉</span>}
                </span>
                <span className="day-date">
                  {day.dateStr?.includes(', ') ? day.dateStr.split(', ')[1] : day.dateStr || ''}
                </span>
              </div>
              <div className="day-weather-chip">
                {getWeatherIcon(day.weather?.condition || 'sunny', 13)}
                <span className="day-temp">{day.weather?.tempC ?? 22}°</span>
              </div>
            </button>
          );
        })}

        {onAddDay && (
          <button
            className="day-tab-pill add-day-tab-btn"
            onClick={onAddDay}
            title="Add Day to Trip"
            style={{ borderStyle: 'dashed' }}
          >
            <Plus size={14} className="text-secondary" />
            <span className="day-title text-secondary">Add Day</span>
          </button>
        )}
      </div>

      {canScrollRight && (
        <button
          type="button"
          className="day-scroll-arrow-btn right"
          onClick={() => handleScroll('right')}
          title="Scroll Right"
          aria-label="Scroll right"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
});

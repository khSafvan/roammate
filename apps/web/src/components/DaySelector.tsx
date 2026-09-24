import React from 'react';
import { Cloud, CloudRain, CloudSun, Lightbulb, Plus, Sun } from 'lucide-react';
import { TripDay, WeatherCondition } from '../types/trip';

interface DaySelectorProps {
  days: TripDay[];
  activeDayIndex: number;
  onSelectDay: (index: number) => void;
  onAddDay?: () => void;
  placesCount?: number;
  isPlacesActive?: boolean;
  onSelectPlaces?: () => void;
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
}) {
  return (
    <div className="day-selector-container">
      <div className="day-selector-scroll">
        {/* Unassigned Places to Visit (Ideas Bucket) Tab */}
        {onSelectPlaces && (
          <button
            className={`day-tab-pill ${isPlacesActive ? 'active' : ''}`}
            onClick={onSelectPlaces}
            title="Unassigned Ideas / Places to Visit bucket"
            style={{
              borderColor: isPlacesActive ? '#D97706' : undefined,
              backgroundColor: isPlacesActive ? 'rgba(245, 158, 11, 0.12)' : undefined,
            }}
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
          return (
            <button
              key={day.id}
              className={`day-tab-pill ${isActive ? 'active' : ''}`}
              onClick={() => onSelectDay(idx)}
            >
              <span
                className="day-color-dot"
                style={{ backgroundColor: day.themeColor }}
              />
              <div className="day-info-stack">
                <span className="day-title">Day {day.dayNumber}</span>
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
    </div>
  );
});

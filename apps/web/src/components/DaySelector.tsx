import React from 'react';
import { Cloud, CloudRain, CloudSun, Sun } from 'lucide-react';
import { TripDay, WeatherCondition } from '../types/trip';

interface DaySelectorProps {
  days: TripDay[];
  activeDayIndex: number;
  onSelectDay: (index: number) => void;
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
}) {
  return (
    <div className="day-selector-container">
      <div className="day-selector-scroll">
        {days.map((day, idx) => {
          const isActive = idx === activeDayIndex;
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
                <span className="day-date">{day.dateStr.split(', ')[1]}</span>
              </div>
              <div className="day-weather-chip">
                {getWeatherIcon(day.weather.condition, 13)}
                <span className="day-temp">{day.weather.tempC}°</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
});

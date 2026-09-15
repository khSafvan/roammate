import React from 'react';
import {
  Cloud,
  CloudRain,
  CloudSun,
  Droplets,
  Shirt,
  Sparkles,
  Sun,
  SunMedium,
  Umbrella,
} from 'lucide-react';
import { DayWeather, WeatherCondition } from '../types/trip';
import { getWeatherComfortLabel } from '../wasm/engine';

interface WeatherBannerProps {
  weather: DayWeather;
  themeColor: string;
}

const getWeatherIcon = (condition: WeatherCondition, size = 20) => {
  switch (condition) {
    case 'sunny':
    case 'clear':
      return <Sun size={size} className="text-amber animate-spin-slow" />;
    case 'partly_cloudy':
      return <CloudSun size={size} className="text-amber" />;
    case 'rainy':
      return <CloudRain size={size} className="text-blue" />;
    case 'cloudy':
    default:
      return <Cloud size={size} className="text-slate" />;
  }
};

export const WeatherBanner: React.FC<WeatherBannerProps> = ({ weather, themeColor }) => {
  const comfortLabel = getWeatherComfortLabel(
    weather.tempC,
    weather.humidity,
    weather.rainProbability
  );

  return (
    <div className="weather-card">
      {/* Top Main Section */}
      <div className="weather-header-row">
        <div className="weather-left">
          <div className="weather-temp-block">
            <div className="weather-icon-wrapper" style={{ backgroundColor: `${themeColor}15` }}>
              {getWeatherIcon(weather.condition, 26)}
            </div>
            <div>
              <div className="weather-temp-main">
                {weather.tempC}°<span className="weather-unit">C</span>
              </div>
              <div className="weather-highlow">
                <span>H: {weather.highC}°</span>
                <span className="sep">•</span>
                <span>L: {weather.lowC}°</span>
              </div>
            </div>
          </div>

          <div className="weather-condition-info">
            <div className="weather-condition-text">{weather.conditionText}</div>
            <div className="weather-comfort-pill">
              <Sparkles size={12} className="text-amber" />
              <span>{comfortLabel}</span>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="weather-metrics">
          <div className="metric-cell">
            <div className="metric-label">
              <Umbrella size={13} />
              <span>Precipitation</span>
            </div>
            <div className={`metric-value ${weather.rainProbability >= 50 ? 'text-rain' : ''}`}>
              {weather.rainProbability}%
            </div>
          </div>

          <div className="metric-cell">
            <div className="metric-label">
              <Droplets size={13} />
              <span>Humidity</span>
            </div>
            <div className="metric-value">{weather.humidity}%</div>
          </div>

          <div className="metric-cell">
            <div className="metric-label">
              <SunMedium size={13} />
              <span>UV Index</span>
            </div>
            <div className="metric-value">{weather.uvIndex} of 10</div>
          </div>
        </div>
      </div>

      {/* Clothing Tip (TripMojo Contextual Intelligence) */}
      <div className="weather-tip-strip">
        <Shirt size={14} className="text-slate flex-shrink-0" />
        <span className="weather-tip-text">
          <strong>Attire Tip:</strong> {weather.clothingTip}
        </span>
      </div>

      {/* Hourly Forecast Stream */}
      {weather.hourly && weather.hourly.length > 0 && (
        <div className="hourly-forecast-row">
          {weather.hourly.map((hour, idx) => (
            <div key={idx} className="hourly-chip">
              <span className="hourly-time">{hour.time}</span>
              <div className="hourly-icon">{getWeatherIcon(hour.condition, 16)}</div>
              <span className="hourly-temp">{hour.tempC}°</span>
              {hour.rainChance > 10 && (
                <span className="hourly-rain">{hour.rainChance}%</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

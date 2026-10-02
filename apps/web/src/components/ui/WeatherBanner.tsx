import React from 'react';
import {
  Camera,
  Cloud,
  CloudRain,
  CloudSun,
  
  Shirt,
  Sparkles,
  Sun,
  
  
} from 'lucide-react';
import { DayWeather, WeatherCondition } from '../../types/trip';
import { getWeatherComfortLabel } from '@roammate/core';

interface WeatherBannerProps {
  weather: DayWeather;
  themeColor: string;
}

const getWeatherIcon = (condition: WeatherCondition, size = 20) => {
  switch (condition) {
    case 'sunny':
    case 'clear':
      return <Sun size={size} strokeWidth={1.75} className="text-amber animate-spin-slow" />;
    case 'partly_cloudy':
      return <CloudSun size={size} strokeWidth={1.75} className="text-amber" />;
    case 'rainy':
      return <CloudRain size={size} strokeWidth={1.75} className="text-blue" />;
    case 'cloudy':
    default:
      return <Cloud size={size} strokeWidth={1.75} className="text-slate" />;
  }
};

const DEFAULT_DAY_WEATHER = {
  tempC: 22,
  highC: 24,
  lowC: 16,
  condition: 'sunny' as WeatherCondition,
  conditionText: 'Fair',
  rainProbability: 0,
  humidity: 50,
  uvIndex: 4,
  clothingTip: 'Comfortable clothing recommended.',
  hourly: [],
};

export const WeatherBanner = React.memo<WeatherBannerProps>(function WeatherBanner({
  weather: rawWeather,
  themeColor,
}) {
  const weather = rawWeather || DEFAULT_DAY_WEATHER;
  const comfortLabel = getWeatherComfortLabel(
    weather.tempC ?? 22,
    weather.humidity ?? 50,
    weather.rainProbability ?? 0
  );

  return (
    <div className="weather-card" style={{ padding: '16px' }}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="weather-icon-wrapper" style={{ backgroundColor: `${themeColor}15`, width: '48px', height: '48px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {getWeatherIcon(weather.condition, 24)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold tabular" style={{ lineHeight: 1 }}>{weather.tempC}°C</span>
              <div className="weather-comfort-pill" style={{ padding: '2px 6px', fontSize: '10px' }}>
                <Sparkles size={10} strokeWidth={1.75} className="text-amber" />
                <span>{comfortLabel}</span>
              </div>
            </div>
            <div className="text-xs text-secondary mt-1 tabular">
              {weather.conditionText} • H: {weather.highC}° L: {weather.lowC}°
              {weather.rainProbability > 0 && ` • ${weather.rainProbability}% Rain`}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-secondary">
          <Shirt size={12} strokeWidth={2} className="text-slate" />
          <span><strong>Attire:</strong> {weather.clothingTip}</span>
        </div>
        {(weather.sunset || weather.goldenHour) && (
          <div className="flex items-center gap-2 text-xs text-amber-700">
            <Camera size={12} strokeWidth={2} />
            <span><strong>Golden Hour:</strong> {weather.goldenHour ? `${weather.goldenHour} – ${weather.sunset}` : weather.sunset}</span>
          </div>
        )}
      </div>
    </div>
  );
});

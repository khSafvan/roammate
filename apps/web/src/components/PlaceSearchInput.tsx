import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { Coordinates, StopCategory } from '../types/trip';

export interface PlaceSearchResult {
  title: string;
  subtitle: string;
  address: string;
  coordinates: Coordinates;
  category: StopCategory;
}

interface PlaceSearchInputProps {
  onSelectPlace: (place: PlaceSearchResult) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Infers a StopCategory from Nominatim OpenStreetMap tags
 */
export function inferCategoryFromOsm(item: any): StopCategory {
  const osmClass = (item.class || '').toLowerCase();
  const osmType = (item.type || '').toLowerCase();
  const address = item.address || {};

  // Dining
  if (
    osmClass === 'amenity' &&
    ['restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'food_court', 'bistro'].includes(osmType)
  ) {
    return 'dining';
  }

  // Lodging
  if (
    osmClass === 'tourism' &&
    ['hotel', 'motel', 'guest_house', 'hostel', 'apartment', 'resort'].includes(osmType)
  ) {
    return 'lodging';
  }

  // Flight / Airport
  if (
    osmClass === 'aeroway' ||
    ['aerodrome', 'airport', 'terminal'].includes(osmType) ||
    address.aeroway
  ) {
    return 'flight';
  }

  // Transit
  if (
    ['station', 'bus_station', 'ferry_terminal', 'subway_entrance'].includes(osmType) ||
    osmClass === 'railway' ||
    osmClass === 'public_transport'
  ) {
    return 'transit';
  }

  // Default to Sight & Attraction
  return 'sight';
}

const CATEGORY_EMOJIS: Record<StopCategory, string> = {
  sight: '🏛️',
  dining: '🍜',
  lodging: '🏨',
  transit: '🚆',
  flight: '✈️',
};

export const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({
  onSelectPlace,
  placeholder = 'Search places, attractions, restaurants (OSM)...',
  className = '',
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          trimmed
        )}&addressdetails=1&limit=5`;
        const res = await fetch(url, {
          headers: {
            'Accept-Language': 'en',
          },
        });

        if (!res.ok) throw new Error('OSM request failed');
        const data = await res.json();

        if (Array.isArray(data)) {
          const mapped: PlaceSearchResult[] = data.map((item: any) => {
            const rawName = item.name || item.display_name.split(',')[0] || trimmed;
            const fullAddress = item.display_name || '';
            const category = inferCategoryFromOsm(item);

            return {
              title: rawName,
              subtitle: `${category.charAt(0).toUpperCase() + category.slice(1)} · ${item.type || 'POI'}`,
              address: fullAddress,
              coordinates: {
                latitude: parseFloat(item.lat),
                longitude: parseFloat(item.lon),
              },
              category,
            };
          });

          setResults(mapped);
          setIsOpen(mapped.length > 0);
        }
      } catch (err) {
        console.warn('Nominatim geocode query error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 350);

    return () => clearTimeout(timeout);
  }, [query]);

  const handleSelect = (place: PlaceSearchResult) => {
    onSelectPlace(place);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative place-search-container ${className}`} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search
          size={15}
          style={{
            position: 'absolute',
            left: '12px',
            color: 'var(--text-tertiary, #94a3b8)',
            pointerEvents: 'none',
          }}
        />
        <input
          type="text"
          autoFocus={autoFocus}
          placeholder={placeholder}
          className="form-input"
          style={{
            paddingLeft: '36px',
            paddingRight: query ? '34px' : '14px',
            width: '100%',
          }}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
        />
        <div style={{ position: 'absolute', right: '10px', display: 'flex', alignItems: 'center' }}>
          {isLoading ? (
            <Loader2 size={15} className="animate-spin" style={{ color: 'var(--text-tertiary, #94a3b8)' }} />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setResults([]);
                setIsOpen(false);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: 'var(--text-tertiary, #94a3b8)',
              }}
              title="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-card, #ffffff)',
            borderRadius: 'var(--radius-lg, 12px)',
            border: '1px solid var(--border-light, #e2e8f0)',
            boxShadow: 'var(--shadow-modal, 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1))',
            zIndex: 120,
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px',
          }}
        >
          {results.map((r, i) => (
            <div
              key={`${r.title}-${i}`}
              onClick={() => handleSelect(r)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md, 8px)',
                cursor: 'pointer',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover, #f1f5f9)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{CATEGORY_EMOJIS[r.category]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary, #0f172a)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {r.title}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-tertiary, #64748b)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '2px',
                  }}
                >
                  <MapPin size={10} style={{ display: 'inline', marginRight: '3px' }} />
                  {r.address}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { Coordinates, StopCategory } from '../types/trip';
import { fuzzySortResults } from '../utils/fuzzySearch';

export interface PlaceSearchResult {
  title: string;
  subtitle: string;
  address: string;
  coordinates: Coordinates;
  category: StopCategory;
}

interface PlaceSearchInputProps {
  onSelectPlace: (place: PlaceSearchResult) => void;
  searchContext?: string;
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
  note: '📝',
};

export const PlaceSearchInput: React.FC<PlaceSearchInputProps> = ({
  onSelectPlace,
  searchContext,
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

  // Debounced search query with context awareness and fuzzy matching
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
        const cleanContext = searchContext ? searchContext.split(',')[0].trim() : '';
        const hasContextInQuery = cleanContext && trimmed.toLowerCase().includes(cleanContext.toLowerCase());

        let searchQuery = trimmed;
        if (cleanContext && !hasContextInQuery) {
          searchQuery = `${trimmed}, ${cleanContext}`;
        }

        const fetchResultsForQuery = async (q: string): Promise<any[]> => {
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            q
          )}&addressdetails=1&limit=8`;
          const res = await fetch(url, {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'roammate/1.0',
            },
          });
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        };

        let data = await fetchResultsForQuery(searchQuery);

        // Fallback to searching without appended context if primary context query yielded 0 results
        if (data.length === 0 && searchQuery !== trimmed) {
          data = await fetchResultsForQuery(trimmed);
        }

        if (data.length > 0) {
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

          // Apply fuzzy ranking and sorting
          const fuzzySorted = fuzzySortResults(mapped, trimmed, (r) => r.title, (r) => r.address);
          setResults(fuzzySorted);
          setIsOpen(fuzzySorted.length > 0);
        } else {
          setResults([]);
          setIsOpen(false);
        }
      } catch (err) {
        console.warn('Nominatim geocode query error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [query, searchContext]);

  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  const handleSelect = (place: PlaceSearchResult) => {
    onSelectPlace(place);
    setQuery('');
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        e.preventDefault();
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSelectedIndex(-1);
    }
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
          role="combobox"
          aria-expanded={isOpen && results.length > 0}
          aria-autocomplete="list"
          aria-controls="places-autocomplete-listbox"
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
          onKeyDown={handleKeyDown}
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
                setSelectedIndex(-1);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px',
                color: 'var(--text-tertiary, #94a3b8)',
              }}
              title="Clear search"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && results.length > 0 && (
        <div
          id="places-autocomplete-listbox"
          role="listbox"
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
              role="option"
              aria-selected={selectedIndex === i}
              onClick={() => handleSelect(r)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '8px 10px',
                borderRadius: 'var(--radius-md, 8px)',
                cursor: 'pointer',
                backgroundColor: selectedIndex === i ? 'var(--bg-subtle, #f1f5f9)' : 'transparent',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={() => setSelectedIndex(i)}
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

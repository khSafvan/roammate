import React, { useEffect, useRef, useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { Loader2, MapPin, Search, X } from 'lucide-react';
import { Coordinates, StopCategory } from '../types/trip';
import { fuzzySortResults } from '../utils/fuzzySearch';

import { inferPlaceCategory } from '@roammate/core';

export interface PlaceSearchResult {
  title: string;
  subtitle: string;
  address: string;
  coordinates: Coordinates;
  category: StopCategory;
  subType?: string;
  isThemeParkOrAttraction?: boolean;
  isHotel?: boolean;
  badgeLabel?: string;
  emoji?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  website?: string;
  phoneNumber?: string;
  photos?: string[];
  imageUrl?: string;
  openTime?: string;
  closeTime?: string;
  tags?: string[];
}

export function inferCategoryFromOsm(item: any): StopCategory {
  if (item.class === 'aeroway' || item.type === 'aerodrome' || item.address?.aeroway) {
    return 'flight';
  }
  const inference = inferPlaceCategory({
    name: item.name || item.display_name?.split(',')[0],
    title: item.display_name?.split(',')[0],
    address: typeof item.address === 'string' ? item.address : item.display_name,
    osmClass: item.class,
    osmType: item.type,
  });
  return inference.category;
}

const CATEGORY_EMOJIS: Record<StopCategory, string> = {
  sight: '🏛️',
  dining: '🍜',
  lodging: '🏨',
  transit: '🚆',
  flight: '✈️',
  note: '📝',
};

interface PlaceSearchInputProps {
  onSelectPlace: (place: PlaceSearchResult) => void;
  searchContext?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}


const searchCache = new Map<string, PlaceSearchResult[]>();
const POPULAR_DUBAI_PLACES = [
  { title: "Burj Khalifa", address: "1 Sheikh Mohammed bin Rashid Blvd, Downtown Dubai", coordinates: { latitude: 25.1972, longitude: 55.2744 }, category: "sight" },
  { title: "Dubai Mall", address: "Downtown Dubai", coordinates: { latitude: 25.1972, longitude: 55.2798 }, category: "sight" },
  { title: "Dubai International Airport (DXB)", address: "Dubai", coordinates: { latitude: 25.2532, longitude: 55.3657 }, category: "transit" },
  { title: "Palace Downtown Dubai", address: "Sheikh Mohammed bin Rashid Blvd", coordinates: { latitude: 25.1932, longitude: 55.2797 }, category: "lodging" },
];

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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const debouncedQuery = useDebounce(query, 200);

  useEffect(() => {
    const trimmed = debouncedQuery.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    
    const cacheKey = `${trimmed}|${searchContext || ''}`;
    if (searchCache.has(cacheKey)) {
      setResults(searchCache.get(cacheKey)!);
      return;
    }
    
    const qLower = trimmed.toLowerCase();
    const localMatches = POPULAR_DUBAI_PLACES.filter(p => p.title.toLowerCase().includes(qLower));
    if (localMatches.length > 0) {
      setResults(localMatches as any[]);
      return;
    }

    setIsLoading(true);
    
    const fetchPlacesAPI = async () => {
      try {
        const cleanContext = searchContext ? searchContext.split(',')[0].trim() : '';
        const hasContextInQuery = cleanContext && trimmed.toLowerCase().includes(cleanContext.toLowerCase());

        let searchQuery = trimmed;
        if (cleanContext && !hasContextInQuery) {
          searchQuery = `${trimmed}, ${cleanContext}`;
        }

        const fetchResultsForQuery = async (q: string): Promise<any[]> => {
          const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8787'}/api/places/search?q=${encodeURIComponent(q)}`;
          const res = await fetch(url);
          if (!res.ok) return [];
          const data = await res.json();
          return Array.isArray(data) ? data : [];
        };

        let data = await fetchResultsForQuery(searchQuery);

        if (data.length === 0 && searchQuery !== trimmed) {
          data = await fetchResultsForQuery(trimmed);
        }

        if (data.length > 0) {
          const mapped: PlaceSearchResult[] = data.map((item: any) => {
            const rawName = item.title || trimmed;
            const fullAddress = item.address || '';
            const inference = inferPlaceCategory({
              name: rawName,
              title: rawName,
              address: fullAddress,
              osmClass: item.osmClass,
              osmType: item.osmType,
            });
            return {
              title: rawName,
              subtitle: inference.label || inference.category,
              address: fullAddress,
              coordinates: item.coordinates,
              category: inference.category,
              openTime: item.openTime,
              closeTime: item.closeTime,
              website: item.website,
              phoneNumber: item.phoneNumber,
              rating: parseFloat(item.rating),
              placeId: item.placeId,
            };
          });

          const fuzzySorted = fuzzySortResults(mapped, trimmed, (r) => r.title, (r) => r.address);
          searchCache.set(cacheKey, fuzzySorted);
          setResults(fuzzySorted);
        } else {
          searchCache.set(cacheKey, []);
          setResults([]);
        }
      } catch (err) {
        console.warn('Places API query error:', err);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlacesAPI();
  }, [debouncedQuery, searchContext]);

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
              <span style={{ fontSize: '16px', lineHeight: 1 }}>{r.emoji || CATEGORY_EMOJIS[r.category]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: 'var(--text-primary, #0f172a)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {r.title}
                  </span>
                  {r.badgeLabel && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: r.isHotel ? 'rgba(59, 130, 246, 0.12)' : r.isThemeParkOrAttraction ? 'rgba(236, 72, 153, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                        color: r.isHotel ? '#2563eb' : r.isThemeParkOrAttraction ? '#db2777' : 'var(--text-secondary, #475569)',
                        flexShrink: 0,
                      }}
                    >
                      {r.badgeLabel}
                    </span>
                  )}
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

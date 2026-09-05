import React, { useEffect, useRef, useState } from 'react';
import { useMap } from '../contexts/MapContext';
import { useI18n } from '../contexts/I18nContext';

interface Suggestion {
  placeId: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
}

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: { placeId: string; address: string; lat: number; lng: number; zoneKey?: string }) => void;
  placeholder: string;
  value?: string;
  onChange?: (text: string) => void;
  onClear?: () => void;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

const PlaceAutocomplete: React.FC<PlaceAutocompleteProps> = ({
  onPlaceSelect,
  placeholder,
  value = '',
  onChange,
  onClear,
}) => {
  const { available } = useMap();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController>();

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const { locale } = useI18n();

  const fetchGoogleSuggestions = async (query: string): Promise<Suggestion[]> => {
    const key = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    if (!key) return [];

    try {
      const endpoint = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';
      const params = new URLSearchParams({ input: query, key, language: locale, components: 'country:do', types: 'geocode' });
      const resp = await fetch(`${endpoint}?${params}`);
      if (!resp.ok) throw new Error('Google Places autocomplete failed');
      const body = await resp.json();
      if (!body.predictions || body.predictions.length === 0) return [];

      const results: Suggestion[] = [];
      const detailEndpoint = 'https://maps.googleapis.com/maps/api/place/details/json';
      const preds = body.predictions.slice(0, 6);
      await Promise.all(
        preds.map(async (p: any) => {
          try {
            const detailParams = new URLSearchParams({ place_id: p.place_id, key, language: locale, fields: 'geometry,name,formatted_address' });
            const dresp = await fetch(`${detailEndpoint}?${detailParams}`);
            if (!dresp.ok) return;
            const dbody = await dresp.json();
            const loc = dbody.result?.geometry?.location;
            results.push({
              placeId: p.place_id,
              description: p.description,
              address: dbody.result?.formatted_address || p.description,
              lat: loc?.lat || 0,
              lng: loc?.lng || 0,
            });
          } catch (e) {
            /* ignore individual detail errors */
          }
        })
      );

      return results;
    } catch (err) {
      console.warn('Google Places error:', err);
      return [];
    }
  };

  const fetchSuggestions = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    try {
      const googleKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      let results: Suggestion[] = [];
      if (googleKey) {
        results = await fetchGoogleSuggestions(query);
      }

      if ((!results || results.length === 0) && query.length >= 3) {
        const params = new URLSearchParams({
          q: query,
          format: 'json',
          limit: '6',
          addressdetails: '1',
          countrycodes: 'do',
          bounded: '1',
          viewbox: '-72.0,20.0,-68.0,17.5',
          'accept-language': locale,
        });

        const response = await fetch(`${NOMINATIM_URL}/search?${params}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'MazBlancoTours/1.0' },
        });

        if (!response.ok) throw new Error('Nominatim request failed');

        const data = await response.json();
        results = (data || []).map((item: any, idx: number) => ({
          placeId: String(item.osm_id || idx),
          description: item.display_name?.split(',')?.slice(0, 3)?.join(',') || item.display_name || '',
          address: item.display_name || '',
          lat: parseFloat(item.lat) || 0,
          lng: parseFloat(item.lon) || 0,
        }));
      }

      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Nominatim search error:', err);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (text: string) => {
    setInputValue(text);
    onChange?.(text);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => fetchSuggestions(text), 400);
  };

  const handleSelect = (suggestion: Suggestion) => {
    setInputValue(suggestion.description);
    setShowSuggestions(false);
    setSuggestions([]);
    onPlaceSelect({
      placeId: suggestion.placeId,
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    onClear?.();
  };

  return (
    <div className="relative">
      <div className="relative flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          inputMode="text"
          autoComplete="off"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) setShowSuggestions(true);
          }}
          onBlur={() => {
            setTimeout(() => setShowSuggestions(false), 200);
          }}
          placeholder={placeholder}
          className="w-full rounded-2xl border-2 border-ink bg-white px-4 py-4 text-base focus:bg-lagoon-light focus:outline-none"
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="text-ink-light transition hover:text-ink-soft"
            aria-label="Clear location"
          >
            ✕
          </button>
        )}
      </div>

      {loading && inputValue.length >= 3 && (
        <div className="mt-1 flex items-center gap-2 px-1 text-xs text-ink-light">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-lagoon border-t-transparent" />
          Searching...
        </div>
      )}

      {showSuggestions && suggestions.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border-2 border-ink bg-white shadow-ink-sm">
          {suggestions.map((s) => (
            <li
              key={s.placeId}
              onMouseDown={() => handleSelect(s)}
              className="cursor-pointer border-b-2 border-ink/10 px-4 py-3 text-sm text-ink-soft transition hover:bg-lagoon-light last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-lagoon shrink-0">📍</span>
                <span className="line-clamp-2">{s.description}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!available && (
        <p className="mt-1 text-xs text-mango-dark">Map services unavailable</p>
      )}
    </div>
  );
};

export default PlaceAutocomplete;

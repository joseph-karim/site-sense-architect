"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface ZoningResult {
  zone_code: string;
  zone_name: string;
  city: string;
  lookup_method?: string;
  max_height_ft: number | null;
  max_height_stories: number | null;
  far: string | null;
  lot_coverage_pct: number | null;
  setback_front_ft: number | null;
  setback_side_ft: number | null;
  setback_rear_ft: number | null;
  permitted_uses: string[];
  conditional_uses: string[];
  prohibited_uses: string[];
  overlays: string[];
  red_flags: string[];
  parking_rules: Record<string, unknown>;
  source_url: string;
}

interface Props {
  city: string;
  cityName: string;
  initialCenter: [number, number];
  initialZoom: number;
}

export default function CityLookupClient({ city, cityName, initialCenter, initialZoom }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  
  const [address, setAddress] = useState("");
  const [suggestions, setSuggestions] = useState<Array<{ place_name: string; center: [number, number] }>>([]);
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [result, setResult] = useState<ZoningResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: initialCenter,
      zoom: initialZoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    // Click handler for map
    map.current.on("click", async (e) => {
      const { lat, lng } = e.lngLat;
      setCoordinates({ lat, lng });
      
      // Update marker
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new mapboxgl.Marker({ color: "#6366f1" })
          .setLngLat([lng, lat])
          .addTo(map.current!);
      }

      // Reverse geocode to get address
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address`
        );
        const data = await res.json();
        if (data.features?.[0]) {
          setAddress(data.features[0].place_name);
        }
      } catch {
        // Ignore reverse geocoding errors
      }

      // Lookup zoning
      lookupZoning(lat, lng);
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [mapboxToken, initialCenter, initialZoom]);

  // Lookup zoning by coordinates
  const lookupZoning = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/zoning/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: lat,
          longitude: lng,
          address: address || undefined,
          city,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Lookup failed");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to lookup zoning");
    } finally {
      setIsLoading(false);
    }
  }, [city, address]);

  // Address search with autocomplete
  const handleAddressChange = async (value: string) => {
    setAddress(value);
    
    if (!mapboxToken || value.length < 3) {
      setSuggestions([]);
      return;
    }

    try {
      // Restrict to the city's bounding box
      const cityBbox: Record<string, string> = {
        seattle: "-122.5,47.4,-122.1,47.8",
        chicago: "-87.95,41.6,-87.4,42.1",
        austin: "-98.0,30.0,-97.5,30.5",
      };

      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?` +
        `access_token=${mapboxToken}&` +
        `types=address,poi&` +
        `bbox=${cityBbox[city] || ""}&` +
        `limit=5`
      );
      const data = await res.json();
      setSuggestions(data.features || []);
    } catch {
      setSuggestions([]);
    }
  };

  // Select suggestion
  const selectSuggestion = (suggestion: { place_name: string; center: [number, number] }) => {
    setAddress(suggestion.place_name);
    setSuggestions([]);
    
    const [lng, lat] = suggestion.center;
    setCoordinates({ lat, lng });

    // Move map and marker
    if (map.current) {
      map.current.flyTo({ center: [lng, lat], zoom: 16 });
      
      if (marker.current) {
        marker.current.setLngLat([lng, lat]);
      } else {
        marker.current = new mapboxgl.Marker({ color: "#6366f1" })
          .setLngLat([lng, lat])
          .addTo(map.current);
      }
    }

    // Lookup zoning
    lookupZoning(lat, lng);
  };

  // Manual search
  const handleSearch = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      // Try to geocode the address first
      if (mapboxToken) {
        const cityBbox: Record<string, string> = {
          seattle: "-122.5,47.4,-122.1,47.8",
          chicago: "-87.95,41.6,-87.4,42.1",
          austin: "-98.0,30.0,-97.5,30.5",
        };

        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?` +
          `access_token=${mapboxToken}&` +
          `types=address&` +
          `bbox=${cityBbox[city] || ""}&` +
          `limit=1`
        );
        const data = await res.json();
        
        if (data.features?.[0]) {
          const [lng, lat] = data.features[0].center;
          setCoordinates({ lat, lng });
          setAddress(data.features[0].place_name);
          
          if (map.current) {
            map.current.flyTo({ center: [lng, lat], zoom: 16 });
            
            if (marker.current) {
              marker.current.setLngLat([lng, lat]);
            } else {
              marker.current = new mapboxgl.Marker({ color: "#6366f1" })
                .setLngLat([lng, lat])
                .addTo(map.current);
            }
          }

          await lookupZoning(lat, lng);
          return;
        }
      }

      // Fallback: try address-only lookup (works for Austin)
      const res = await fetch("/api/zoning/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, city }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Address not found");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to lookup address");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Map Panel */}
      <div className="card-base overflow-hidden">
        {!mapboxToken ? (
          <div className="aspect-[4/3] lg:aspect-auto lg:h-[500px] flex items-center justify-center bg-surface-subtle">
            <div className="text-center p-6">
              <p className="text-text-secondary">Map unavailable</p>
              <p className="text-sm text-text-tertiary mt-1">Use the address search instead</p>
            </div>
          </div>
        ) : (
          <div 
            ref={mapContainer} 
            className="aspect-[4/3] lg:aspect-auto lg:h-[500px]"
          />
        )}
      </div>

      {/* Search & Results Panel */}
      <div className="space-y-6">
        {/* Search Box */}
        <div className="card-base p-6">
          <label className="block text-sm font-medium text-text-primary mb-2">
            Search Address in {cityName}
          </label>
          <div className="relative">
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={`Enter a ${cityName} address...`}
              className="input-base w-full pr-24"
            />
            <button
              onClick={handleSearch}
              disabled={isLoading || !address}
              className="absolute right-1 top-1 bottom-1 px-4 bg-accent-primary text-white rounded-lg font-medium text-sm hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "..." : "Lookup"}
            </button>

            {/* Suggestions Dropdown */}
            {suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface-elevated border border-border-default rounded-lg shadow-lg z-20 overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => selectSuggestion(s)}
                    className="w-full px-4 py-3 text-left text-sm hover:bg-surface-subtle border-b border-border-subtle last:border-0 transition-colors"
                  >
                    <span className="text-text-primary">{s.place_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {coordinates && (
            <p className="mt-2 text-xs text-text-tertiary">
              Coordinates: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
            </p>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="card-base border-status-error/30 bg-status-error/5 p-4">
            <p className="text-sm text-status-error font-medium">{error}</p>
            <p className="text-xs text-text-tertiary mt-1">
              Make sure the address is within {cityName} city limits.
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="card-base p-6">
            <div className="animate-pulse space-y-3">
              <div className="h-6 bg-surface-subtle rounded w-1/3"></div>
              <div className="h-4 bg-surface-subtle rounded w-2/3"></div>
              <div className="h-4 bg-surface-subtle rounded w-1/2"></div>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !isLoading && (
          <div className="card-base overflow-hidden">
            <div className="p-6 border-b border-border-subtle bg-gradient-to-r from-accent-primary/5 to-transparent">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">
                    Zoning District
                  </p>
                  <h3 className="text-2xl font-bold text-text-primary">
                    {result.zone_code}
                  </h3>
                  <p className="text-text-secondary">{result.zone_name}</p>
                </div>
                <Link
                  href={`/zoning/${result.city}/${encodeURIComponent(result.zone_code)}`}
                  className="btn-primary text-sm"
                >
                  Full Details →
                </Link>
              </div>
              {result.lookup_method && (
                <p className="text-xs text-text-tertiary mt-3">
                  Lookup method: {result.lookup_method.replace("_", " ")}
                </p>
              )}
            </div>

            <div className="p-6 space-y-4">
              {/* Dimensional Limits */}
              <div>
                <h4 className="text-sm font-semibold text-text-primary mb-3">Dimensional Limits</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-surface-subtle rounded-lg p-3 text-center">
                    <p className="text-xs text-text-tertiary">Max Height</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {result.max_height_ft ? `${result.max_height_ft} ft` : "—"}
                    </p>
                  </div>
                  <div className="bg-surface-subtle rounded-lg p-3 text-center">
                    <p className="text-xs text-text-tertiary">FAR</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {result.far || "—"}
                    </p>
                  </div>
                  <div className="bg-surface-subtle rounded-lg p-3 text-center">
                    <p className="text-xs text-text-tertiary">Lot Coverage</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {result.lot_coverage_pct ? `${result.lot_coverage_pct}%` : "—"}
                    </p>
                  </div>
                  <div className="bg-surface-subtle rounded-lg p-3 text-center">
                    <p className="text-xs text-text-tertiary">Front Setback</p>
                    <p className="text-lg font-semibold text-text-primary">
                      {result.setback_front_ft ? `${result.setback_front_ft} ft` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Permitted Uses */}
              {result.permitted_uses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-2">Permitted Uses</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.permitted_uses.slice(0, 8).map((use) => (
                      <span key={use} className="badge-success text-xs">
                        {use}
                      </span>
                    ))}
                    {result.permitted_uses.length > 8 && (
                      <span className="text-xs text-text-tertiary">
                        +{result.permitted_uses.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Conditional Uses */}
              {result.conditional_uses.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-2">Conditional Uses</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.conditional_uses.slice(0, 6).map((use) => (
                      <span key={use} className="badge-warning text-xs">
                        {use}
                      </span>
                    ))}
                    {result.conditional_uses.length > 6 && (
                      <span className="text-xs text-text-tertiary">
                        +{result.conditional_uses.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Overlays */}
              {result.overlays.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-text-primary mb-2">Overlays</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.overlays.map((overlay) => (
                      <span key={overlay} className="badge-info text-xs">
                        {overlay}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CTA Footer */}
            <div className="p-4 bg-surface-subtle border-t border-border-subtle">
              <Link 
                href={`/fit-analysis/new?city=${result.city}&lat=${coordinates?.lat}&lng=${coordinates?.lng}&address=${encodeURIComponent(address)}`}
                className="btn-secondary w-full text-center"
              >
                Run Project Fit Analysis for This Site →
              </Link>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !isLoading && !error && (
          <div className="card-base p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-subtle flex items-center justify-center">
              <svg className="w-8 h-8 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-text-primary mb-2">Select a Location</h3>
            <p className="text-sm text-text-secondary">
              Click on the map or search for an address in {cityName} to see zoning information.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

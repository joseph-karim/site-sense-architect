"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

// City center coordinates
const CITY_CENTERS: Record<string, { lng: number; lat: number; zoom: number }> = {
  seattle: { lng: -122.3321, lat: 47.6062, zoom: 12 },
  austin: { lng: -97.7431, lat: 30.2672, zoom: 12 },
  chicago: { lng: -87.6298, lat: 41.8781, zoom: 12 },
};

interface MapAddressPickerProps {
  city: string;
  mapboxToken: string;
  onAddressSelect: (address: string, lat: number, lng: number) => void;
  className?: string;
}

export function MapAddressPicker({
  city,
  mapboxToken,
  onAddressSelect,
  className = "",
}: MapAddressPickerProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const placeMarker = useCallback((lng: number, lat: number) => {
    if (!map.current || !marker.current) return;
    marker.current.setLngLat([lng, lat]).addTo(map.current);
  }, []);

  const reverseGeocode = useCallback(
    async (lng: number, lat: number) => {
      if (!mapboxToken) return;

      setIsLoading(true);
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${mapboxToken}&types=address`
        );
        const data = await response.json();
        const feature = data.features?.[0];

        if (feature) {
          const address = feature.place_name;
          setSelectedAddress(address);
          onAddressSelect(address, lat, lng);
        } else {
          setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      } catch (error) {
        console.error("Reverse geocoding failed:", error);
        setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      } finally {
        setIsLoading(false);
      }
    },
    [mapboxToken, onAddressSelect]
  );

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    const center = CITY_CENTERS[city] || CITY_CENTERS.seattle;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [center.lng, center.lat],
      zoom: center.zoom,
    });

    // Add navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Add geocoder search control
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserHeading: false,
      }),
      "top-right"
    );

    // Create marker
    marker.current = new mapboxgl.Marker({
      color: "#319795",
      draggable: true,
    });

    // Handle marker drag end
    marker.current.on("dragend", () => {
      const lngLat = marker.current?.getLngLat();
      if (lngLat) {
        reverseGeocode(lngLat.lng, lngLat.lat);
      }
    });

    // Handle map click
    map.current.on("click", (e) => {
      const { lng, lat } = e.lngLat;
      placeMarker(lng, lat);
      reverseGeocode(lng, lat);
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken, city, placeMarker, reverseGeocode]);

  // Update map center when city changes
  useEffect(() => {
    if (!map.current) return;
    const center = CITY_CENTERS[city] || CITY_CENTERS.seattle;
    map.current.flyTo({
      center: [center.lng, center.lat],
      zoom: center.zoom,
      duration: 1500,
    });
    // Clear marker and address when city changes
    marker.current?.remove();
    setSelectedAddress(null);
  }, [city]);

  return (
    <div className={`relative ${className}`}>
      {/* Map container */}
      <div
        ref={mapContainer}
        className="w-full h-[300px] rounded-lg overflow-hidden border border-gray-200"
      />

      {/* Selected address display */}
      <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 min-h-[60px]">
        {isLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-sm">Looking up address...</span>
          </div>
        ) : selectedAddress ? (
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-accent-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <div>
              <p className="text-sm font-medium text-gray-900">{selectedAddress}</p>
              <p className="text-xs text-gray-500 mt-1">
                Click anywhere on the map or drag the marker to change location
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-gray-500">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
            <span className="text-sm">Click on the map to select a location</span>
          </div>
        )}
      </div>
    </div>
  );
}

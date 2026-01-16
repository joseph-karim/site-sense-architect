"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Cities, type City } from "@/lib/cities";
import { UseTypes } from "@/lib/seo/staticParams";
import { ZoningLookupClient } from "@/components/ZoningLookupClient";

export function CommercialZoningSnapshotToolClient({ mapboxToken }: { mapboxToken?: string }) {
  const search = useSearchParams();
  const initialCity = (search.get("city")?.toLowerCase() as City) ?? "seattle";
  const [city, setCity] = useState<City>(Cities.includes(initialCity) ? initialCity : "seattle");

  const cityLabel = useMemo(() => city.charAt(0).toUpperCase() + city.slice(1), [city]);

  return (
    <div className="space-y-6">
      <div className="card-glass p-6 space-y-3">
        <div className="text-sm text-gray-400">Scope</div>
        <div className="text-white font-medium">
          Commercial and institutional projects only (
          {UseTypes.map((u) => u.replace("-", " ")).join(", ")}).
        </div>
      </div>

      <div className="card-glass p-6 space-y-3">
        <div className="text-sm text-gray-400">City</div>
        <div className="flex flex-wrap gap-2">
          {Cities.map((c) => {
            const active = c === city;
            const label = c.charAt(0).toUpperCase() + c.slice(1);
            return (
              <button
                key={c}
                type="button"
                onClick={() => setCity(c)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  active
                    ? "bg-accent-500 text-white shadow-glow"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="text-xs text-gray-500">
          Current city: <span className="text-gray-300">{cityLabel}</span>
        </div>
      </div>

      <ZoningLookupClient key={city} city={city} mapboxToken={mapboxToken} />
    </div>
  );
}


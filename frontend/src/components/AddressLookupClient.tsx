"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronRight,
  ArrowRight,
  Building2,
  Ruler,
  Layers,
  FileText,
  ExternalLink,
  Sparkles,
} from "lucide-react";

interface ZoningResult {
  zone_code: string;
  zone_name: string;
  city: string;
  max_height_ft: number | null;
  max_height_stories: number | null;
  far: number | string | null;
  lot_coverage_pct: number | null;
  setback_front_ft: number | null;
  setback_side_ft: number | null;
  setback_rear_ft: number | null;
  permitted_uses: string[];
  conditional_uses: string[];
  prohibited_uses: string[];
  overlays: string[];
  red_flags: string[];
  source_url: string;
}

export function AddressLookupClient({ mapboxToken }: { mapboxToken?: string }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const initialAddress = searchParams.get("address") || "";
  const initialCity = searchParams.get("city") || "";

  const [address, setAddress] = useState(initialAddress);
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<ZoningResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchedAddress, setSearchedAddress] = useState("");

  // Auto-search if address is in URL
  useEffect(() => {
    if (initialAddress && !result) {
      performSearch(initialAddress);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialAddress]);

  const performSearch = useCallback(async (searchAddress: string) => {
    if (!searchAddress.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);
    setSearchedAddress(searchAddress);

    try {
      // First geocode the address
      let lat: number, lng: number;

      if (mapboxToken) {
        const geocodeRes = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchAddress)}.json?access_token=${mapboxToken}&country=US&types=address`
        );
        const geocodeData = await geocodeRes.json();

        if (!geocodeData.features || geocodeData.features.length === 0) {
          throw new Error("Address not found. Please check the address and try again.");
        }

        lng = geocodeData.features[0].center[0];
        lat = geocodeData.features[0].center[1];
      } else {
        // Default coordinates for demo
        lat = 47.6062;
        lng = -122.3321;
      }

      // Now lookup zoning
      const zoningRes = await fetch("/api/zoning/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latitude: lat, longitude: lng }),
      });

      if (!zoningRes.ok) {
        const errorData = await zoningRes.json();
        throw new Error(errorData.error || "Failed to lookup zoning");
      }

      const zoningData = await zoningRes.json();
      setResult(zoningData);

      // Update URL with address
      router.push(`/lookup?address=${encodeURIComponent(searchAddress)}`, { scroll: false });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setIsSearching(false);
    }
  }, [mapboxToken, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(address);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="text-center space-y-4">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
          Zoning Lookup by Address
        </h1>
        <p className="text-lg text-gray-400">
          Enter any address to find its zone code, permitted uses, and dimensional limits.
        </p>
      </header>

      {/* Search Form */}
      <form onSubmit={handleSubmit} className="card-glass p-6">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter property address (e.g., 600 Pine St, Seattle WA)"
              className="input-lg pl-12 w-full"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !address.trim()}
            className="btn-primary-lg disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            Lookup
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-xs text-gray-500">
          <span>Examples:</span>
          <button
            type="button"
            onClick={() => { setAddress("600 Pine St, Seattle WA"); performSearch("600 Pine St, Seattle WA"); }}
            className="text-accent-400 hover:text-accent-300"
          >
            600 Pine St, Seattle
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => { setAddress("233 S Wacker Dr, Chicago IL"); performSearch("233 S Wacker Dr, Chicago IL"); }}
            className="text-accent-400 hover:text-accent-300"
          >
            233 S Wacker Dr, Chicago
          </button>
        </div>
      </form>

      {/* Loading State */}
      {isSearching && (
        <div className="card-glass p-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-accent-400 mx-auto mb-4" />
          <p className="text-gray-400">Looking up zoning for this address...</p>
        </div>
      )}

      {/* Error State */}
      {error && !isSearching && (
        <div className="card-glass p-6 border-red-500/30 bg-red-500/5">
          <div className="flex items-start gap-4">
            <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-white">Lookup Failed</h3>
              <p className="text-sm text-gray-400 mt-1">{error}</p>
              <p className="text-sm text-gray-500 mt-2">
                Make sure to include city and state in the address (e.g., &quot;123 Main St, Seattle WA&quot;)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {result && !isSearching && (
        <div className="space-y-6 animate-fade-in">
          {/* Address Banner */}
          <div className="card-glass p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-accent-400" />
            <span className="text-white font-medium">{searchedAddress}</span>
            <span className="badge-neutral ml-auto">{result.city}</span>
          </div>

          {/* Zone Overview */}
          <div className="card-glass p-6 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-sm text-gray-500 uppercase tracking-wide mb-1">Zone Code</div>
                <h2 className="text-3xl font-mono font-bold text-white">{result.zone_code}</h2>
                {result.zone_name && (
                  <p className="text-gray-400 mt-1">{result.zone_name}</p>
                )}
              </div>
              <Link
                href={`/zoning/${result.city}/${encodeURIComponent(result.zone_code.toLowerCase())}`}
                className="btn-secondary text-sm"
              >
                View Full Details
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                icon={<Ruler className="w-5 h-5" />}
                label="Max Height"
                value={result.max_height_ft ? `${result.max_height_ft} ft` : "—"}
                subValue={result.max_height_stories ? `${result.max_height_stories} stories` : undefined}
              />
              <MetricCard
                icon={<Building2 className="w-5 h-5" />}
                label="FAR"
                value={result.far ? String(result.far) : "—"}
              />
              <MetricCard
                icon={<Layers className="w-5 h-5" />}
                label="Lot Coverage"
                value={result.lot_coverage_pct ? `${result.lot_coverage_pct}%` : "—"}
              />
              <MetricCard
                icon={<Ruler className="w-5 h-5" />}
                label="Front Setback"
                value={result.setback_front_ft !== null ? `${result.setback_front_ft} ft` : "—"}
              />
            </div>
          </div>

          {/* Permitted Uses */}
          {result.permitted_uses && result.permitted_uses.length > 0 && (
            <div className="card-glass p-6 space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-white">Permitted Uses ({result.permitted_uses.length})</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.permitted_uses.slice(0, 15).map((use, i) => (
                  <span key={i} className="badge-success">{use}</span>
                ))}
                {result.permitted_uses.length > 15 && (
                  <span className="badge-neutral">+{result.permitted_uses.length - 15} more</span>
                )}
              </div>
            </div>
          )}

          {/* Conditional Uses */}
          {result.conditional_uses && result.conditional_uses.length > 0 && (
            <div className="card-glass p-6 space-y-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <h3 className="font-semibold text-white">Conditional Uses ({result.conditional_uses.length})</h3>
              </div>
              <p className="text-sm text-gray-400">
                These uses may be allowed with a Conditional Use Permit (CUP).
              </p>
              <div className="flex flex-wrap gap-2">
                {result.conditional_uses.slice(0, 10).map((use, i) => (
                  <span key={i} className="badge-warning">{use}</span>
                ))}
                {result.conditional_uses.length > 10 && (
                  <span className="badge-neutral">+{result.conditional_uses.length - 10} more</span>
                )}
              </div>
            </div>
          )}

          {/* Overlays */}
          {result.overlays && result.overlays.length > 0 && (
            <div className="card-glass p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-400" />
                <h3 className="font-semibold text-white">Overlay Districts</h3>
              </div>
              <p className="text-sm text-gray-400">
                This property is subject to additional overlay requirements.
              </p>
              <div className="flex flex-wrap gap-2">
                {result.overlays.map((overlay, i) => (
                  <span key={i} className="badge-info">{overlay}</span>
                ))}
              </div>
            </div>
          )}

          {/* Red Flags */}
          {result.red_flags && result.red_flags.length > 0 && (
            <div className="card-glass p-6 space-y-4 border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <h3 className="font-semibold text-white">Things to Watch</h3>
              </div>
              <ul className="space-y-2">
                {result.red_flags.map((flag, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-yellow-300">
                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Source */}
          {result.source_url && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <FileText className="w-4 h-4" />
              Source:
              <a
                href={result.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-400 hover:text-accent-300 flex items-center gap-1"
              >
                Official Zoning Code
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Next Steps CTAs */}
          <div className="grid gap-4 md:grid-cols-2">
            <Link
              href={`/fit-analysis/new?address=${encodeURIComponent(searchedAddress)}`}
              className="card-highlight p-6 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center text-accent-400">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-accent-300 transition-colors">
                    Run Fit Analysis
                  </h3>
                  <p className="text-sm text-gray-400">
                    Check if your project requirements fit this zone
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-accent-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>

            <Link
              href={`/zoning/${result.city}/${encodeURIComponent(result.zone_code.toLowerCase())}`}
              className="card-interactive p-6 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-gray-400">
                  <Building2 className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white group-hover:text-accent-300 transition-colors">
                    Full Zone Details
                  </h3>
                  <p className="text-sm text-gray-400">
                    View complete {result.zone_code} zoning rules
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-accent-400 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!result && !isSearching && !error && (
        <div className="card-glass p-12 text-center">
          <MapPin className="w-16 h-16 text-gray-700 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Enter an address to get started</h2>
          <p className="text-gray-400 max-w-md mx-auto">
            We&apos;ll show you the zone code, permitted uses, height limits, FAR, 
            and any overlay requirements for the property.
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ 
  icon, 
  label, 
  value, 
  subValue 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  subValue?: string;
}) {
  return (
    <div className="metric-card">
      <div className="flex items-center gap-2 text-gray-500 mb-2">
        {icon}
        <span className="metric-label">{label}</span>
      </div>
      <div className="metric-value">{value}</div>
      {subValue && <div className="metric-subvalue">{subValue}</div>}
    </div>
  );
}

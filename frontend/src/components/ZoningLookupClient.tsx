"use client";

import { useMemo, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { City } from "@/lib/cities";
import { UseTypes } from "@/lib/seo/staticParams";
import { 
  MapPin, 
  Search, 
  FileText, 
  Download, 
  AlertTriangle, 
  Flag, 
  CheckCircle2,
  XCircle,
  Loader2,
  Map,
  Type,
  ChevronRight,
  Building2
} from "lucide-react";

// Dynamically import map component to avoid SSR issues with mapbox-gl
const MapAddressPicker = dynamic(
  () => import("./MapAddressPicker").then((mod) => mod.MapAddressPicker),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[350px] rounded-xl bg-white/5 animate-pulse flex items-center justify-center border border-white/10">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
          <span className="text-gray-500 text-sm">Loading map...</span>
        </div>
      </div>
    ),
  }
);

type InputMode = "text" | "map";

interface ZoningLookupClientProps {
  city: City;
  mapboxToken?: string;
}

export function ZoningLookupClient({ city, mapboxToken }: ZoningLookupClientProps) {
  const [inputMode, setInputMode] = useState<InputMode>(mapboxToken ? "map" : "text");
  const [address, setAddress] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [useType, setUseType] = useState<(typeof UseTypes)[number]>("office");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => address.trim().length >= 3 && !loading, [address, loading]);

  const handleMapAddressSelect = useCallback((selectedAddress: string, lat: number, lng: number) => {
    setAddress(selectedAddress);
    setCoordinates({ lat, lng });
  }, []);

  async function onSubmit() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const url = new URL("/api/zoning/lookup", window.location.origin);
      url.searchParams.set("address", address);
      url.searchParams.set("city", city);
      url.searchParams.set("use_type", useType);
      // Pass coordinates if available (from map selection)
      if (coordinates) {
        url.searchParams.set("lat", coordinates.lat.toString());
        url.searchParams.set("lng", coordinates.lng.toString());
      }
      const response = await fetch(url.toString());
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error ?? "Request failed");
      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Input Card */}
      <div className="card-glass overflow-hidden">
        {/* Input mode toggle */}
        {mapboxToken && (
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setInputMode("map")}
              className={`flex-1 px-5 py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                inputMode === "map"
                  ? "bg-white/10 text-white border-b-2 border-accent-500"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Map className="w-4 h-4" />
              Select on Map
            </button>
            <button
              onClick={() => setInputMode("text")}
              className={`flex-1 px-5 py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                inputMode === "text"
                  ? "bg-white/10 text-white border-b-2 border-accent-500"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Type className="w-4 h-4" />
              Type Address
            </button>
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Map input mode */}
          {inputMode === "map" && mapboxToken && (
            <MapAddressPicker
              city={city}
              mapboxToken={mapboxToken}
              onAddressSelect={handleMapAddressSelect}
            />
          )}

          {/* Text input mode */}
          {inputMode === "text" && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Property Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setCoordinates(null);
                  }}
                  placeholder="123 Main Street, Seattle, WA"
                  className="input-elevated pl-12"
                />
              </div>
              <p className="text-xs text-gray-500">
                Enter a full street address including city and state
              </p>
            </div>
          )}

          {/* Selected address display when using map */}
          {inputMode === "map" && address && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-accent-500/10 border border-accent-500/20">
              <CheckCircle2 className="w-5 h-5 text-accent-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-medium text-accent-300">Location selected</div>
                <p className="text-sm text-gray-300 mt-0.5">{address}</p>
              </div>
            </div>
          )}

          {/* Use type selector */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">
              Intended Use
        </label>
          <select
            value={useType}
            onChange={(e) => setUseType(e.target.value as any)}
              className="select-elevated"
          >
            {UseTypes.map((t) => (
              <option key={t} value={t} className="bg-primary-950">
                  {t.replace("-", " ").replace(/(^\w|\s\w)/g, (m) => m.toUpperCase())}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500">
            Commercial + institutional projects only (residential-only is excluded).
          </p>
          </div>

          {/* Submit button */}
          <button
            disabled={!canSubmit}
            onClick={onSubmit}
            className="btn-primary w-full justify-center py-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Analyzing zoning constraints...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                Run Zoning Analysis
              </>
            )}
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-error-500/10 border border-error-500/20 animate-slide-up">
          <XCircle className="w-5 h-5 text-error-500 flex-shrink-0 mt-0.5" />
            <div>
            <p className="text-sm font-medium text-error-500">Analysis failed</p>
            <p className="text-sm text-gray-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results display */}
      {result?.output && (
        <div className="card-glass overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary-900 to-primary-800 p-6 border-b border-white/10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-accent-400" />
                  <span className="text-sm font-medium text-gray-400">ZONING CONSTRAINT SNAPSHOT</span>
                </div>
                <h3 className="text-2xl font-display font-bold text-white">
                  {result.output?.zoning_district?.zone_code}
                </h3>
                <p className="text-gray-300">
                  {result.output?.zoning_district?.zone_name}
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/report/${result.web_slug}`}
                  className="btn-secondary text-sm py-2.5"
                >
                  <FileText className="w-4 h-4" />
                  View Full Report
                </Link>
                <a
                  href={`/api/artifact/${result.artifact_id}/pdf`}
                  className="btn-primary text-sm py-2.5"
                >
                  <Download className="w-4 h-4" />
                  Download PDF
                </a>
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="p-6 space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                label="Height Limit"
                value={result.output.height_limit?.max_height_ft}
                unit="ft"
                sublabel={
                  result.output.height_limit?.max_height_stories
                    ? `or ${result.output.height_limit.max_height_stories} stories`
                    : undefined
                }
              />
              <MetricCard label="Floor Area Ratio" value={result.output.far} />
              <MetricCard label="Lot Coverage" value={result.output.lot_coverage_pct} unit="%" />
              <MetricCard
                label="Front Setback"
                value={result.output.setbacks_ft?.front}
                unit="ft"
              />
              <MetricCard
                label="Side Setback"
                value={result.output.setbacks_ft?.side}
                unit="ft"
              />
              <MetricCard
                label="Rear Setback"
                value={result.output.setbacks_ft?.rear}
                unit="ft"
              />
            </div>

            {/* Use Permissions */}
            {(result.output.allowed_uses?.permitted?.length > 0 ||
              result.output.allowed_uses?.conditional?.length > 0 ||
              result.output.allowed_uses?.prohibited?.length > 0) && (
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white uppercase tracking-wide">
                  Use Permissions for: {useType}
                </h4>
                <div className="space-y-2">
                  {result.output.allowed_uses?.permitted?.map((use: string, i: number) => (
                    <div key={`p-${i}`} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-success-500" />
                      <span className="text-gray-300">{use}</span>
                      <span className="badge-success ml-auto">Permitted</span>
                    </div>
                  ))}
                  {result.output.allowed_uses?.conditional?.map((use: string, i: number) => (
                    <div key={`c-${i}`} className="flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-warning-500" />
                      <span className="text-gray-300">{use}</span>
                      <span className="badge-warning ml-auto">Conditional</span>
                    </div>
                  ))}
                  {result.output.allowed_uses?.prohibited?.map((use: string, i: number) => (
                    <div key={`x-${i}`} className="flex items-center gap-2 text-sm">
                      <XCircle className="w-4 h-4 text-error-500" />
                      <span className="text-gray-300">{use}</span>
                      <span className="badge-error ml-auto">Prohibited</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overlay flags */}
            {result.output.overlay_flags?.length > 0 && (
              <div className="p-4 rounded-xl bg-warning-500/10 border border-warning-500/20">
                <h4 className="text-sm font-semibold text-warning-500 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Overlay Districts Detected
                </h4>
                <ul className="space-y-2">
                  {result.output.overlay_flags.map((flag: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <ChevronRight className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Red flags */}
            {result.output.red_flags?.length > 0 && (
              <div className="p-4 rounded-xl bg-error-500/10 border border-error-500/20">
                <h4 className="text-sm font-semibold text-error-500 mb-3 flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  Red Flags
                </h4>
                <ul className="space-y-2">
                  {result.output.red_flags.map((flag: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <ChevronRight className="w-4 h-4 text-error-500 flex-shrink-0 mt-0.5" />
                      {flag}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next steps */}
            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href={`/permits/${city}/new-construction`}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent-500/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-info-500/20 text-info-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">View Permit Pathway</div>
                    <div className="text-xs text-gray-400">Timeline estimates &amp; requirements</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </Link>
              <Link
                href={`/tools/corridor-width-checker`}
                className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent-500/30 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-warning-500/20 text-warning-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">Run Code Tripwires</div>
                    <div className="text-xs text-gray-400">Check for common RFI triggers</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </Link>
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-gray-500 italic border-t border-white/10 pt-4">
              {result.output.disclaimer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  label,
  value,
  unit,
  sublabel,
}: {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  sublabel?: string;
}) {
  const displayValue = value ?? "—";
  const hasValue = value !== null && value !== undefined;

  return (
    <div className="metric-card">
      <dt className="text-xs text-gray-400 font-medium uppercase tracking-wide">{label}</dt>
      <dd className="mt-2">
        <span className={`text-3xl font-display font-bold ${hasValue ? "text-white" : "text-gray-600"}`}>
          {displayValue}
        </span>
        {unit && hasValue && <span className="text-lg text-gray-400 ml-1">{unit}</span>}
      </dd>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
    </div>
  );
}

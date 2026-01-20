"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Upload,
  MapPin,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileText,
  Building2,
  Loader2,
  Download,
  Share2,
  Sparkles,
  Edit3,
  RefreshCw,
  ExternalLink,
  Quote,
  Search,
} from "lucide-react";

interface ProjectRequirements {
  projectName: string | null;
  proposedUse: string;
  targetSF: number | null;
  heightNeeded: number | null;
  stories: number | null;
  parkingStalls: number | null;
  timeline: string | null;
  additionalNotes: string;
}

interface RawExtract {
  field: string;
  value: string;
  sourceText: string;
}

interface ZoningData {
  zone_code: string;
  zone_name: string;
  city: string;
  max_height_ft: number | null;
  far: number | null;
  lot_coverage_pct: number | null;
  permitted_uses: string[];
  conditional_uses: string[];
  prohibited_uses: string[];
  overlays: string[];
  red_flags: string[];
  source_url: string;
}

interface AnalysisItem {
  category: string;
  status: "ok" | "conditional" | "conflict";
  requirement: string;
  zoningAllows: string;
  explanation: string;
  citation: string;
}

interface Risk {
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  impact: string;
  mitigation?: string;
}

interface FitAnalysisResult {
  verdict: "fits" | "conditional" | "conflicts";
  verdictSummary: string;
  zoning: ZoningData;
  requirements: ProjectRequirements;
  analysis: {
    verdict: string;
    verdictSummary: string;
    analysis: AnalysisItem[];
    risks: Risk[];
    recommendations: string[];
  };
  address: string;
}

type Step = "input" | "parsing" | "confirm" | "analyzing" | "results";

export function FitAnalysisClient({ mapboxToken }: { mapboxToken?: string }) {
  const searchParams = useSearchParams();
  const initialMode = searchParams.get("mode") === "manual" ? "manual" : "upload";

  const [step, setStep] = useState<Step>("input");
  const [mode, setMode] = useState<"upload" | "manual">(initialMode);
  const [address, setAddress] = useState("");
  const [addressInput, setAddressInput] = useState("");
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [rawExtracts, setRawExtracts] = useState<RawExtract[]>([]);
  const [requirements, setRequirements] = useState<ProjectRequirements>({
    projectName: null,
    proposedUse: "",
    targetSF: null,
    heightNeeded: null,
    stories: null,
    parkingStalls: null,
    timeline: null,
    additionalNotes: "",
  });
  const [result, setResult] = useState<FitAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Geocode address using Mapbox or fallback
  const geocodeAddress = useCallback(async () => {
    if (!addressInput.trim()) return;
    
    setIsGeocoding(true);
    setError(null);
    
    try {
      // Use Mapbox Geocoding API if token is available
      if (mapboxToken) {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(addressInput)}.json?access_token=${mapboxToken}&country=US&types=address`
        );
        const data = await res.json();
        
        if (data.features && data.features.length > 0) {
          const feature = data.features[0];
          setAddress(feature.place_name);
          setCoordinates({
            lng: feature.center[0],
            lat: feature.center[1],
          });
          return;
        }
      }
      
      // Fallback: try our own geocode API
      const res = await fetch("/api/debug/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressInput }),
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.lat && data.lng) {
          setAddress(data.formatted_address || addressInput);
          setCoordinates({ lat: data.lat, lng: data.lng });
          return;
        }
      }
      
      // If no geocoding worked, just use the address text and set mock coords
      // for Seattle downtown as a fallback for demo
      setAddress(addressInput);
      setCoordinates({ lat: 47.6062, lng: -122.3321 }); // Seattle default
      setError("Could not verify address location. Using approximate coordinates for Seattle.");
    } catch (err) {
      setError("Failed to geocode address. Please check the address and try again.");
    } finally {
      setIsGeocoding(false);
    }
  }, [addressInput, mapboxToken]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);
  };

  const parseRFQ = async () => {
    if (!uploadedFile && !pastedText) {
      setError("Please upload a file or paste RFQ text");
      return;
    }

    setStep("parsing");
    setIsExtracting(true);
    setError(null);

    try {
      const formData = new FormData();
      if (uploadedFile) {
        formData.append("file", uploadedFile);
      }
      if (pastedText) {
        formData.append("text", pastedText);
      }

      const res = await fetch("/api/ai/parse-rfq", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to parse RFQ");
      }

      const extracted = data.requirements;
      
      // Helper to safely extract value (AI may return {value, confidence} or direct value)
      const getValue = <T,>(field: unknown, defaultValue: T): T => {
        if (field === null || field === undefined) return defaultValue;
        if (typeof field === "object" && "value" in (field as Record<string, unknown>)) {
          return (field as { value: T }).value ?? defaultValue;
        }
        return field as T;
      };
      
      // Safely handle arrays that might come back as non-arrays or {value: [...]} from AI
      const getArrayValue = (field: unknown): string[] => {
        if (Array.isArray(field)) return field;
        if (field && typeof field === "object" && "value" in (field as Record<string, unknown>)) {
          const val = (field as { value: unknown }).value;
          return Array.isArray(val) ? val : [];
        }
        return [];
      };
      
      const sustainabilityTargets = getArrayValue(extracted.sustainabilityTargets);
      const specialRequirements = getArrayValue(extracted.specialRequirements);
      
      setRequirements({
        projectName: getValue(extracted.projectName, null),
        proposedUse: getValue(extracted.proposedUse, "") || "",
        targetSF: getValue(extracted.targetSF, null),
        heightNeeded: getValue(extracted.heightNeeded, null),
        stories: getValue(extracted.stories, null),
        parkingStalls: getValue(extracted.parkingStalls, null),
        timeline: getValue(extracted.timeline, null),
        additionalNotes: [...sustainabilityTargets, ...specialRequirements].join(". "),
      });
      setRawExtracts(Array.isArray(extracted.rawExtracts) ? extracted.rawExtracts : []);
      setStep("confirm");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse RFQ");
      setStep("input");
    } finally {
      setIsExtracting(false);
    }
  };

  const runAnalysis = async () => {
    if (!address || !coordinates) {
      setError("Please select an address");
      return;
    }
    if (!requirements.proposedUse) {
      setError("Please specify the proposed use");
      return;
    }

    setStep("analyzing");
    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/analyze-fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requirements,
          latitude: coordinates.lat,
          longitude: coordinates.lng,
          address,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to analyze fit");
      }

      setResult(data);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setStep("confirm");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setStep("input");
    setResult(null);
    setAddress("");
    setCoordinates(null);
    setUploadedFile(null);
    setPastedText("");
    setRawExtracts([]);
    setRequirements({
      projectName: null,
      proposedUse: "",
      targetSF: null,
      heightNeeded: null,
      stories: null,
      parkingStalls: null,
      timeline: null,
      additionalNotes: "",
    });
  };

  // STEP: Input (Address + File Upload)
  if (step === "input") {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-4">
          <div className="inline-flex items-center gap-2 text-accent-400">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium uppercase tracking-wide">AI-Powered Fit Analysis</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight text-white">
            Does your project fit this site?
          </h1>
          <p className="text-lg text-gray-400">
            Upload an RFQ or paste project details. Our AI extracts requirements and cross-references with zoning codes.
          </p>
        </header>

        {/* Address Section First */}
        <div className="card-glass p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-accent-400" />
            Step 1: Site Address
          </h2>
          <p className="text-sm text-gray-400">
            Enter the address or click on the map to select the site.
          </p>

          <div className="flex gap-2">
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && geocodeAddress()}
              placeholder="Enter address (e.g., 123 Main St, Seattle WA)"
              className="flex-1 px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500"
            />
            <button
              onClick={geocodeAddress}
              disabled={isGeocoding || !addressInput.trim()}
              className="btn-secondary px-4 disabled:opacity-50"
            >
              {isGeocoding ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Search className="w-5 h-5" />
              )}
            </button>
          </div>

          {address && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <span className="text-sm text-white">{address}</span>
            </div>
          )}
        </div>

        {/* Mode Toggle */}
        <div className="card-glass p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent-400" />
            Step 2: Project Requirements
          </h2>

          <div className="flex gap-2 p-1 rounded-lg bg-white/5 w-fit">
            <button
              onClick={() => setMode("upload")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "upload" ? "bg-accent-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Upload/Paste RFQ
            </button>
            <button
              onClick={() => setMode("manual")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                mode === "manual" ? "bg-accent-500 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              <Edit3 className="w-4 h-4 inline mr-2" />
              Enter Manually
            </button>
          </div>

          {/* Upload Section */}
          {mode === "upload" && (
            <div className="space-y-4">
              <label className="relative flex flex-col items-center justify-center gap-4 p-6 border-2 border-dashed border-white/20 rounded-xl hover:border-accent-500/50 hover:bg-accent-500/5 transition-all cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                {uploadedFile ? (
                  <>
                    <CheckCircle2 className="w-8 h-8 text-green-400" />
                    <span className="text-white font-medium">{uploadedFile.name}</span>
                    <span className="text-sm text-gray-400">Click to replace</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-gray-400" />
                    <span className="text-gray-300">Drop file here or click to upload</span>
                    <span className="text-xs text-gray-500">PDF, Word, or plain text</span>
                  </>
                )}
              </label>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-primary-900 text-gray-400">or paste text</span>
                </div>
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste RFQ text here..."
                rows={6}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500 resize-none font-mono text-sm"
              />

              {(uploadedFile || pastedText) && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-accent-500/10 border border-accent-500/20">
                  <Sparkles className="w-5 h-5 text-accent-400" />
                  <span className="text-sm text-accent-300">
                    AI will extract: use type, square footage, height, parking, and other requirements
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Manual Entry Section */}
          {mode === "manual" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">
                    Proposed Use <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={requirements.proposedUse}
                    onChange={(e) => setRequirements({ ...requirements, proposedUse: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-accent-500"
                  >
                    <option value="">Select use type...</option>
                    <option value="office">Office</option>
                    <option value="retail">Retail</option>
                    <option value="restaurant">Restaurant / Food Service</option>
                    <option value="mixed-use">Mixed Use</option>
                    <option value="healthcare">Healthcare / Medical</option>
                    <option value="education">Education</option>
                    <option value="civic">Civic / Institutional</option>
                    <option value="hotel">Hotel / Lodging</option>
                    <option value="warehouse">Warehouse / Industrial</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">Target SF</label>
                  <input
                    type="number"
                    value={requirements.targetSF || ""}
                    onChange={(e) => setRequirements({ ...requirements, targetSF: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="e.g., 45000"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500"
                  />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">Height (ft)</label>
                  <input
                    type="number"
                    value={requirements.heightNeeded || ""}
                    onChange={(e) => setRequirements({ ...requirements, heightNeeded: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="e.g., 85"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">Stories</label>
                  <input
                    type="number"
                    value={requirements.stories || ""}
                    onChange={(e) => setRequirements({ ...requirements, stories: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="e.g., 8"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-white">Parking Stalls</label>
                  <input
                    type="number"
                    value={requirements.parkingStalls || ""}
                    onChange={(e) => setRequirements({ ...requirements, parkingStalls: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="e.g., 50"
                    className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          {mode === "upload" && (uploadedFile || pastedText) && (
            <button
              onClick={parseRFQ}
              disabled={!address}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              Extract Requirements with AI
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
          {mode === "manual" && (
            <button
              onClick={() => setStep("confirm")}
              disabled={!address || !requirements.proposedUse}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // STEP: Parsing
  if (step === "parsing") {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8 py-20">
        <Loader2 className="w-16 h-16 animate-spin text-accent-400 mx-auto" />
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-white">Extracting Requirements</h2>
          <p className="text-gray-400">AI is reading your RFQ and extracting project details...</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <Loader2 className="w-4 h-4 animate-spin" />
            Reading document...
          </span>
        </div>
      </div>
    );
  }

  // STEP: Confirm Extracted Requirements
  if (step === "confirm") {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="space-y-4">
          <button onClick={() => setStep("input")} className="btn-ghost text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-3xl font-display font-bold text-white">Confirm Requirements</h1>
          <p className="text-gray-400">
            Review and edit the extracted requirements before analysis.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10">
            <MapPin className="w-5 h-5 text-accent-400" />
            <span className="text-sm text-gray-300">{address}</span>
          </div>
        </header>

        {/* Extracted Citations */}
        {rawExtracts.length > 0 && (
          <div className="card-glass p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-2">
              <Quote className="w-4 h-4" />
              AI Extracted From Document
            </h3>
            <div className="space-y-2">
              {rawExtracts.slice(0, 5).map((extract, i) => (
                <div key={i} className="flex items-start gap-3 p-2 rounded bg-white/5">
                  <span className="text-xs font-medium text-accent-400 uppercase min-w-[80px]">{extract.field}</span>
                  <span className="text-sm text-white">{extract.value}</span>
                  <span className="text-xs text-gray-500 italic ml-auto max-w-[200px] truncate">
                    &ldquo;{extract.sourceText}&rdquo;
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Editable Requirements */}
        <div className="card-glass p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-white">Project Requirements</h2>
            <span className="text-xs text-gray-500">Edit any values that need correction</span>
          </div>

          {requirements.projectName && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">Project Name</label>
              <input
                type="text"
                value={requirements.projectName || ""}
                onChange={(e) => setRequirements({ ...requirements, projectName: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-accent-500"
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">
                Proposed Use <span className="text-red-400">*</span>
              </label>
              <select
                value={requirements.proposedUse}
                onChange={(e) => setRequirements({ ...requirements, proposedUse: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:border-accent-500"
              >
                <option value="">Select use type...</option>
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="restaurant">Restaurant / Food Service</option>
                <option value="mixed-use">Mixed Use</option>
                <option value="healthcare">Healthcare / Medical</option>
                <option value="education">Education</option>
                <option value="civic">Civic / Institutional</option>
                <option value="hotel">Hotel / Lodging</option>
                <option value="warehouse">Warehouse / Industrial</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">Target Square Footage</label>
              <input
                type="number"
                value={requirements.targetSF || ""}
                onChange={(e) => setRequirements({ ...requirements, targetSF: e.target.value ? parseInt(e.target.value) : null })}
                placeholder="e.g., 45000"
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">Height (ft)</label>
              <input
                type="number"
                value={requirements.heightNeeded || ""}
                onChange={(e) => setRequirements({ ...requirements, heightNeeded: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">Stories</label>
              <input
                type="number"
                value={requirements.stories || ""}
                onChange={(e) => setRequirements({ ...requirements, stories: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white">Parking Stalls</label>
              <input
                type="number"
                value={requirements.parkingStalls || ""}
                onChange={(e) => setRequirements({ ...requirements, parkingStalls: e.target.value ? parseInt(e.target.value) : null })}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Timeline</label>
            <input
              type="text"
              value={requirements.timeline || ""}
              onChange={(e) => setRequirements({ ...requirements, timeline: e.target.value })}
              placeholder="e.g., 18 months from permit to occupancy"
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white">Additional Notes</label>
            <textarea
              value={requirements.additionalNotes}
              onChange={(e) => setRequirements({ ...requirements, additionalNotes: e.target.value })}
              placeholder="Other requirements (sustainability, special features, etc.)"
              rows={3}
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-accent-500 resize-none"
            />
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-between">
          <button onClick={() => setStep("input")} className="btn-ghost">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <button
            onClick={runAnalysis}
            disabled={!requirements.proposedUse}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" />
            Analyze Project Fit
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // STEP: Analyzing
  if (step === "analyzing") {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8 py-20">
        <Loader2 className="w-16 h-16 animate-spin text-accent-400 mx-auto" />
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-white">Analyzing Project Fit</h2>
          <p className="text-gray-400">AI is cross-referencing your requirements with zoning codes...</p>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Address verified
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            Requirements confirmed
          </span>
          <span className="flex items-center gap-1.5">
            <Loader2 className="w-4 h-4 animate-spin" />
            Analyzing zoning fit...
          </span>
        </div>
      </div>
    );
  }

  // STEP: Results
  if (step === "results" && result) {
    const analysis = result.analysis;
    const verdictColors = {
      fits: {
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        text: "text-green-300",
        icon: <CheckCircle2 className="w-8 h-8 text-green-400" />,
        label: "Project Fits This Site",
      },
      conditional: {
        bg: "bg-yellow-500/10",
        border: "border-yellow-500/20",
        text: "text-yellow-300",
        icon: <AlertTriangle className="w-8 h-8 text-yellow-400" />,
        label: "Project Fits with Approvals",
      },
      conflicts: {
        bg: "bg-red-500/10",
        border: "border-red-500/20",
        text: "text-red-300",
        icon: <XCircle className="w-8 h-8 text-red-400" />,
        label: "Zoning Conflicts Identified",
      },
    };

    const v = verdictColors[analysis.verdict as keyof typeof verdictColors] || verdictColors.conditional;

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <header className="space-y-4">
          <button onClick={resetAnalysis} className="btn-ghost text-sm">
            <RefreshCw className="w-4 h-4" />
            New Analysis
          </button>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <MapPin className="w-4 h-4" />
            {result.address}
          </div>
        </header>

        {/* Verdict Banner */}
        <div className={`flex items-center gap-4 p-6 rounded-xl ${v.bg} border ${v.border}`}>
          {v.icon}
          <div className="flex-1">
            <div className={`font-display font-bold text-xl ${v.text}`}>{v.label}</div>
            <div className="text-sm text-gray-300">{analysis.verdictSummary}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn-ghost text-sm">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            <button className="btn-secondary text-sm">
              <Download className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-4">
          <MetricBox label="Zone" value={result.zoning.zone_code} subValue={result.zoning.zone_name} />
          <MetricBox
            label="Max Height"
            value={result.zoning.max_height_ft ? `${result.zoning.max_height_ft} ft` : "—"}
            subValue={result.requirements.heightNeeded ? `Need: ${result.requirements.heightNeeded} ft` : undefined}
          />
          <MetricBox label="FAR" value={result.zoning.far ? String(result.zoning.far) : "—"} />
          <MetricBox
            label="City"
            value={result.zoning.city.charAt(0).toUpperCase() + result.zoning.city.slice(1)}
          />
        </div>

        {/* Detailed Analysis with Citations */}
        <div className="card-glass p-6 space-y-4">
          <h2 className="text-lg font-display font-semibold text-white">Detailed Analysis</h2>
          <div className="space-y-4">
            {analysis.analysis?.map((item: AnalysisItem, i: number) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  item.status === "ok"
                    ? "bg-green-500/5 border-green-500/20"
                    : item.status === "conditional"
                    ? "bg-yellow-500/5 border-yellow-500/20"
                    : "bg-red-500/5 border-red-500/20"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {item.status === "ok" ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5" />
                    ) : item.status === "conditional" ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400 mt-0.5" />
                    )}
                    <div>
                      <div className="font-medium text-white capitalize">{item.category}</div>
                      <div className="text-sm text-gray-400 mt-1">{item.explanation}</div>
                      {item.citation && (
                        <div className="flex items-start gap-2 mt-2 p-2 rounded bg-white/5">
                          <Quote className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" />
                          <span className="text-xs text-gray-400 italic">{item.citation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <div className="text-gray-500">Requirement</div>
                    <div className="text-white">{item.requirement}</div>
                    <div className="text-gray-500 mt-2">Zoning</div>
                    <div className="text-white">{item.zoningAllows}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risks */}
        {analysis.risks && analysis.risks.length > 0 && (
          <div className="card-glass p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-white">
              Schedule & Approval Risks ({analysis.risks.length})
            </h2>
            <div className="space-y-3">
              {analysis.risks.map((risk: Risk, i: number) => (
                <div
                  key={i}
                  className={`p-4 rounded-lg border ${
                    risk.severity === "high"
                      ? "bg-red-500/10 border-red-500/20"
                      : risk.severity === "medium"
                      ? "bg-yellow-500/10 border-yellow-500/20"
                      : "bg-blue-500/10 border-blue-500/20"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                        risk.severity === "high"
                          ? "text-red-400"
                          : risk.severity === "medium"
                          ? "text-yellow-400"
                          : "text-blue-400"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-white">{risk.title}</div>
                      <div className="text-sm text-gray-400 mt-1">{risk.description}</div>
                      <div className="text-xs text-gray-500 mt-2">Impact: {risk.impact}</div>
                      {risk.mitigation && (
                        <div className="text-xs text-accent-400 mt-1">Mitigation: {risk.mitigation}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {analysis.recommendations && analysis.recommendations.length > 0 && (
          <div className="card-glass p-6 space-y-4">
            <h2 className="text-lg font-display font-semibold text-white">Recommendations</h2>
            <ul className="space-y-2">
              {analysis.recommendations.map((rec: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                  <ArrowRight className="w-4 h-4 text-accent-400 mt-0.5 flex-shrink-0" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Source */}
        {result.zoning.source_url && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
            <ExternalLink className="w-4 h-4" />
            <a href={result.zoning.source_url} target="_blank" rel="noopener noreferrer" className="hover:text-accent-400">
              View source zoning code
            </a>
          </div>
        )}

        {/* Part3 Upsell */}
        <div className="card-glass p-6 bg-gradient-to-r from-primary-900/50 to-accent-900/30 border-accent-500/20">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-display font-semibold text-white">Ready to pursue this project?</h3>
              <p className="text-sm text-gray-300">
                Track permits, manage RFIs, and coordinate CA in Part3 — with your zoning constraints and risks pre-loaded.
              </p>
            </div>
            <button className="btn-primary whitespace-nowrap">
              <Building2 className="w-4 h-4" />
              Start Project in Part3
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function MetricBox({
  label,
  value,
  subValue,
  valueColor = "text-white",
}: {
  label: string;
  value: string;
  subValue?: string;
  valueColor?: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-white/5 border border-white/10">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className={`text-xl font-semibold ${valueColor}`}>{value}</div>
      {subValue && <div className="text-xs text-gray-500 mt-0.5">{subValue}</div>}
    </div>
  );
}

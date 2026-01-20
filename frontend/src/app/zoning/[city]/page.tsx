import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  Building2, 
  Search, 
  ArrowRight, 
  ChevronRight,
  MapPin,
  FileText,
  Filter,
} from "lucide-react";
import { getPool } from "@/lib/db/pool";

// Zone data type
type ZoneItem = {
  zone_code: string;
  zone_name: string | null;
  max_height_ft: number | null;
  far: string | null;
  permitted_count: number;
  conditional_count: number;
};

// City configuration
const CITY_CONFIG: Record<string, {
  name: string;
  state: string;
  description: string;
  codeSource: string;
  codeUrl: string;
}> = {
  seattle: {
    name: "Seattle",
    state: "WA",
    description: "Seattle Municipal Code Title 23 governs land use and zoning. The city uses a form-based code approach with zone designations indicating allowed uses and dimensional limits.",
    codeSource: "Seattle Municipal Code",
    codeUrl: "https://library.municode.com/wa/seattle/codes/municipal_code",
  },
  chicago: {
    name: "Chicago",
    state: "IL",
    description: "Chicago Zoning Ordinance (Title 17) establishes districts for residential, business, commercial, manufacturing, and special purpose uses throughout the city.",
    codeSource: "Chicago Zoning Ordinance",
    codeUrl: "https://codelibrary.amlegal.com/codes/chicago/latest/overview",
  },
  austin: {
    name: "Austin",
    state: "TX",
    description: "Austin Land Development Code establishes zoning districts and development standards. The city is transitioning to a new code with different zone categories.",
    codeSource: "Austin Land Development Code",
    codeUrl: "https://library.municode.com/tx/austin/codes/land_development_code",
  },
};

interface PageProps {
  params: Promise<{ city: string }>;
}

export async function generateStaticParams() {
  return Object.keys(CITY_CONFIG).map((city) => ({ city }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city } = await params;
  const config = CITY_CONFIG[city];
  if (!config) return { title: "City Not Found" };

  return {
    title: `${config.name} Commercial Zoning Codes | All Zones & Permitted Uses`,
    description: `Browse all ${config.name} zoning districts for commercial projects. Find permitted uses, height limits, FAR, and dimensional requirements for every zone code.`,
    openGraph: {
      title: `${config.name} Commercial Zoning Codes`,
      description: `Complete zoning reference for ${config.name} commercial projects. Explore ${config.name} zone codes, permitted uses, and development standards.`,
    },
  };
}

export default async function CityZoningPage({ params }: PageProps) {
  const { city } = await params;
  const config = CITY_CONFIG[city];
  if (!config) notFound();

  // Fetch zone data from database
  const pool = getPool();
  let zones: ZoneItem[] = [];

  let useTypeCounts: Array<{ use_type: string; count: number }> = [];

  if (pool) {
    try {
      // Get all zones for this city with stats
      const zonesResult = await pool.query(`
        SELECT 
          zone_code,
          max_height_ft,
          far,
          COALESCE(array_length(permitted_uses, 1), 0) as permitted_count,
          COALESCE(array_length(conditional_uses, 1), 0) as conditional_count
        FROM zoning_rules
        WHERE city = $1
        ORDER BY zone_code
      `, [city]);
      
      zones = zonesResult.rows;

      // Get use type breakdown
      const usesResult = await pool.query(`
        SELECT unnest(permitted_uses) as use_type, COUNT(*) as count
        FROM zoning_rules
        WHERE city = $1 AND permitted_uses IS NOT NULL
        GROUP BY use_type
        ORDER BY count DESC
        LIMIT 10
      `, [city]);
      
      useTypeCounts = usesResult.rows;
    } catch (error) {
      console.error("Error fetching zones:", error);
    }
  }

  // Group zones by prefix for better organization
  const zoneGroups = groupZonesByPrefix(zones);

  return (
    <div className="space-y-12">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight className="w-4 h-4 breadcrumb-separator" />
        <Link href="/zoning">Zoning</Link>
        <ChevronRight className="w-4 h-4 breadcrumb-separator" />
        <span className="text-white">{config.name}</span>
      </nav>

      {/* Header */}
      <header className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
              {config.name} Commercial Zoning Codes
            </h1>
            <p className="text-gray-400 max-w-2xl">
              {config.description}
            </p>
            <div className="flex flex-wrap gap-4 text-sm">
              <a 
                href={config.codeUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-link"
              >
                <FileText className="w-4 h-4" />
                {config.codeSource}
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="metric-card text-center min-w-[100px]">
              <div className="metric-value">{zones.length}</div>
              <div className="metric-label">Zone Codes</div>
            </div>
            <div className="metric-card text-center min-w-[100px]">
              <div className="metric-value">{useTypeCounts.length}+</div>
              <div className="metric-label">Use Types</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Link href={`/lookup?city=${city}`} className="btn-primary">
            <MapPin className="w-4 h-4" />
            Lookup Address
          </Link>
          <Link href={`/zoning/${city}/use/office`} className="btn-secondary">
            <Building2 className="w-4 h-4" />
            Find by Use Type
          </Link>
        </div>
      </header>

      {/* Search */}
      <div className="card-glass p-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            placeholder={`Search ${config.name} zone codes...`}
            className="input pl-12"
            id="zone-search"
          />
        </div>
      </div>

      {/* Use Type Quick Links */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Browse by Use Type</h2>
        <div className="flex flex-wrap gap-2">
          {["office", "retail", "restaurant", "mixed-use", "healthcare", "hotel", "education"].map((use) => (
            <Link
              key={use}
              href={`/zoning/${city}/use/${use}`}
              className="badge-neutral hover:bg-white/20 transition-colors capitalize"
            >
              {use.replace("-", " ")}
            </Link>
          ))}
        </div>
      </section>

      {/* Zone Listings by Group */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">All Zone Codes</h2>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Filter className="w-4 h-4" />
            {zones.length} zones
          </div>
        </div>

        {Object.entries(zoneGroups).length > 0 ? (
          Object.entries(zoneGroups).map(([prefix, groupZones]) => (
            <div key={prefix} className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                {prefix} Zones ({groupZones.length})
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {groupZones.map((zone) => (
                  <Link
                    key={zone.zone_code}
                    href={`/zoning/${city}/${encodeURIComponent(zone.zone_code.toLowerCase())}`}
                    className="zone-list-item group"
                  >
                    <div className="flex-1">
                      <div className="zone-code group-hover:text-accent-300 transition-colors">
                        {zone.zone_code}
                      </div>
                      <div className="flex gap-3 mt-1 text-xs text-gray-500">
                        {zone.max_height_ft && (
                          <span>{zone.max_height_ft} ft</span>
                        )}
                        {zone.far && (
                          <span>FAR {zone.far}</span>
                        )}
                        <span>{zone.permitted_count} permitted uses</span>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-accent-400 group-hover:translate-x-1 transition-all" />
                  </Link>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="card-glass p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No zones loaded yet</h3>
            <p className="text-gray-400 mb-4">
              Zone data for {config.name} is being imported. Check back soon.
            </p>
            <Link href="/lookup" className="btn-primary">
              Try Address Lookup Instead
            </Link>
          </div>
        )}
      </section>

      {/* SEO Content */}
      <section className="card-glass p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">
          About {config.name} Zoning
        </h2>
        <div className="prose prose-invert prose-sm max-w-none text-gray-400">
          <p>
            {config.name}, {config.state} uses a comprehensive zoning code to regulate land use and 
            development throughout the city. Commercial zoning districts determine what types of 
            businesses can operate at a location, as well as building height, density (FAR), 
            setbacks, and parking requirements.
          </p>
          <p>
            Before starting any commercial project in {config.name}, architects and developers should:
          </p>
          <ul>
            <li>Verify the zoning designation for their specific property</li>
            <li>Confirm the proposed use is permitted or conditionally allowed</li>
            <li>Check dimensional limits (height, FAR, lot coverage, setbacks)</li>
            <li>Identify any overlay districts that may impose additional requirements</li>
            <li>Understand the permit pathway and typical approval timeline</li>
          </ul>
          <p>
            Use our tools to lookup any {config.name} address and get instant zoning information, 
            or browse individual zone codes above to understand permitted uses and development standards.
          </p>
        </div>
      </section>

      {/* Related Tools CTA */}
      <section className="grid gap-4 md:grid-cols-2">
        <Link href="/fit-analysis/new" className="card-interactive p-6 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white group-hover:text-accent-300 transition-colors">
                Project Fit Analysis
              </h3>
              <p className="text-sm text-gray-400">
                Upload RFQ to check if your project fits a {config.name} site
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-accent-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>

        <Link href={`/permits/${city}`} className="card-interactive p-6 group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400">
              <FileText className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white group-hover:text-accent-300 transition-colors">
                Permit Pathways
              </h3>
              <p className="text-sm text-gray-400">
                Understand {config.name} permit process and timelines
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-accent-400 group-hover:translate-x-1 transition-all" />
          </div>
        </Link>
      </section>
    </div>
  );
}

function groupZonesByPrefix(zones: ZoneItem[]): Record<string, ZoneItem[]> {
  const groups: Record<string, ZoneItem[]> = {};
  
  zones.forEach((zone) => {
    // Extract prefix (letters before numbers or special chars)
    const match = zone.zone_code.match(/^([A-Za-z]+)/);
    const prefix = match ? match[1].toUpperCase() : "Other";
    
    if (!groups[prefix]) {
      groups[prefix] = [];
    }
    groups[prefix].push(zone);
  });

  // Sort groups alphabetically
  const sortedGroups: Record<string, ZoneItem[]> = {};
  Object.keys(groups).sort().forEach((key) => {
    sortedGroups[key] = groups[key];
  });

  return sortedGroups;
}

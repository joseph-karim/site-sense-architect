import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  ChevronRight,
  ArrowRight,
  MapPin,
} from "lucide-react";
import { getPool } from "@/lib/db/pool";

// Use type configuration
const USE_TYPES: Record<string, {
  name: string;
  description: string;
  searchTerms: string[];
  relatedUses: string[];
}> = {
  office: {
    name: "Office",
    description: "General office, professional services, corporate headquarters, coworking spaces, and business centers.",
    searchTerms: ["office", "professional", "business", "corporate", "coworking"],
    relatedUses: ["retail", "mixed-use", "healthcare"],
  },
  retail: {
    name: "Retail",
    description: "Stores, shops, showrooms, and general retail sales establishments.",
    searchTerms: ["retail", "store", "shop", "sales", "merchandise"],
    relatedUses: ["office", "restaurant", "mixed-use"],
  },
  restaurant: {
    name: "Restaurant",
    description: "Restaurants, cafes, bars, food service establishments, and eating/drinking places.",
    searchTerms: ["restaurant", "cafe", "bar", "food", "dining", "eating", "drinking"],
    relatedUses: ["retail", "entertainment", "hotel"],
  },
  "mixed-use": {
    name: "Mixed-Use",
    description: "Combined uses including residential over retail, office/retail combinations, and multi-use developments.",
    searchTerms: ["mixed", "multi-use", "combined", "live-work"],
    relatedUses: ["office", "retail", "residential"],
  },
  healthcare: {
    name: "Healthcare",
    description: "Medical offices, clinics, hospitals, urgent care, dental offices, and health services.",
    searchTerms: ["medical", "healthcare", "clinic", "hospital", "health", "dental"],
    relatedUses: ["office", "education", "civic"],
  },
  hotel: {
    name: "Hotel",
    description: "Hotels, motels, lodging, extended stay, and hospitality establishments.",
    searchTerms: ["hotel", "motel", "lodging", "hospitality", "inn"],
    relatedUses: ["restaurant", "retail", "entertainment"],
  },
  education: {
    name: "Education",
    description: "Schools, universities, training centers, daycare, and educational facilities.",
    searchTerms: ["education", "school", "university", "training", "daycare", "learning"],
    relatedUses: ["civic", "office", "healthcare"],
  },
  civic: {
    name: "Civic / Institutional",
    description: "Government buildings, libraries, community centers, religious institutions, and public facilities.",
    searchTerms: ["civic", "government", "public", "community", "religious", "institutional"],
    relatedUses: ["education", "office", "healthcare"],
  },
  warehouse: {
    name: "Warehouse / Industrial",
    description: "Warehouses, distribution centers, light manufacturing, and industrial uses.",
    searchTerms: ["warehouse", "industrial", "manufacturing", "distribution", "storage"],
    relatedUses: ["office", "retail"],
  },
  entertainment: {
    name: "Entertainment",
    description: "Theaters, cinemas, sports facilities, recreation centers, and entertainment venues.",
    searchTerms: ["entertainment", "theater", "cinema", "sports", "recreation"],
    relatedUses: ["restaurant", "retail", "hotel"],
  },
};

const CITY_NAMES: Record<string, string> = {
  seattle: "Seattle",
  chicago: "Chicago",
  austin: "Austin",
};

interface PageProps {
  params: Promise<{ city: string; useType: string }>;
}

export async function generateStaticParams() {
  const params: Array<{ city: string; useType: string }> = [];
  Object.keys(CITY_NAMES).forEach((city) => {
    Object.keys(USE_TYPES).forEach((useType) => {
      params.push({ city, useType });
    });
  });
  return params;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { city, useType } = await params;
  const cityName = CITY_NAMES[city];
  const useConfig = USE_TYPES[useType];
  
  if (!cityName || !useConfig) return { title: "Not Found" };

  return {
    title: `${useConfig.name} Zoning in ${cityName} | Where Can You Build ${useConfig.name}?`,
    description: `Find which ${cityName} zones allow ${useConfig.name.toLowerCase()} use. See permitted, conditional, and prohibited zones for ${useConfig.description.toLowerCase()}`,
    openGraph: {
      title: `${useConfig.name} Zoning in ${cityName}`,
      description: `Complete guide to ${useConfig.name.toLowerCase()} zoning in ${cityName}. Find permitted zones and requirements.`,
    },
  };
}

export default async function UseTypePage({ params }: PageProps) {
  const { city, useType } = await params;
  const cityName = CITY_NAMES[city];
  const useConfig = USE_TYPES[useType];
  
  if (!cityName || !useConfig) notFound();

  // Fetch zones that allow this use
  const pool = getPool();
  let permittedZones: Array<{ zone_code: string; max_height_ft: number | null; far: string | null }> = [];
  let conditionalZones: Array<{ zone_code: string; max_height_ft: number | null; far: string | null }> = [];
  let prohibitedZones: Array<{ zone_code: string }> = [];

  if (pool) {
    try {
      // Search for zones where this use type appears in permitted/conditional/prohibited
      const searchTerms = useConfig.searchTerms;
      const searchPattern = searchTerms.map(t => `%${t}%`).join("|");

      // Permitted uses
      const permittedResult = await pool.query(`
        SELECT zone_code, max_height_ft, far
        FROM zoning_rules
        WHERE city = $1 
          AND permitted_uses IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM unnest(permitted_uses) u 
            WHERE ${searchTerms.map((_, i) => `LOWER(u) LIKE $${i + 2}`).join(" OR ")}
          )
        ORDER BY zone_code
      `, [city, ...searchTerms.map(t => `%${t.toLowerCase()}%`)]);
      permittedZones = permittedResult.rows;

      // Conditional uses
      const conditionalResult = await pool.query(`
        SELECT zone_code, max_height_ft, far
        FROM zoning_rules
        WHERE city = $1 
          AND conditional_uses IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM unnest(conditional_uses) u 
            WHERE ${searchTerms.map((_, i) => `LOWER(u) LIKE $${i + 2}`).join(" OR ")}
          )
          AND NOT EXISTS (
            SELECT 1 FROM unnest(permitted_uses) u 
            WHERE ${searchTerms.map((_, i) => `LOWER(u) LIKE $${i + 2}`).join(" OR ")}
          )
        ORDER BY zone_code
      `, [city, ...searchTerms.map(t => `%${t.toLowerCase()}%`)]);
      conditionalZones = conditionalResult.rows;

      // Prohibited uses (limited sample)
      const prohibitedResult = await pool.query(`
        SELECT zone_code
        FROM zoning_rules
        WHERE city = $1 
          AND prohibited_uses IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM unnest(prohibited_uses) u 
            WHERE ${searchTerms.map((_, i) => `LOWER(u) LIKE $${i + 2}`).join(" OR ")}
          )
        ORDER BY zone_code
        LIMIT 10
      `, [city, ...searchTerms.map(t => `%${t.toLowerCase()}%`)]);
      prohibitedZones = prohibitedResult.rows;

    } catch (error) {
      console.error("Error fetching use type zones:", error);
    }
  }

  const totalFound = permittedZones.length + conditionalZones.length;

  return (
    <div className="space-y-12">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        <Link href="/">Home</Link>
        <ChevronRight className="w-4 h-4 breadcrumb-separator" />
        <Link href="/zoning">Zoning</Link>
        <ChevronRight className="w-4 h-4 breadcrumb-separator" />
        <Link href={`/zoning/${city}`}>{cityName}</Link>
        <ChevronRight className="w-4 h-4 breadcrumb-separator" />
        <span className="text-white">{useConfig.name}</span>
      </nav>

      {/* Header */}
      <header className="space-y-6">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-4xl font-display font-bold text-white">
            {useConfig.name} Zoning in {cityName}
          </h1>
          <p className="text-lg text-gray-400 max-w-3xl">
            Where can you build {useConfig.name.toLowerCase()} projects in {cityName}? 
            Below are zones that permit or conditionally allow {useConfig.description.toLowerCase()}
          </p>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4">
          <div className="metric-card flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <div>
              <div className="metric-value text-green-400">{permittedZones.length}</div>
              <div className="metric-label">Permitted</div>
            </div>
          </div>
          <div className="metric-card flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            <div>
              <div className="metric-value text-yellow-400">{conditionalZones.length}</div>
              <div className="metric-label">Conditional</div>
            </div>
          </div>
          {prohibitedZones.length > 0 && (
            <div className="metric-card flex items-center gap-3">
              <XCircle className="w-6 h-6 text-red-400" />
              <div>
                <div className="metric-value text-red-400">{prohibitedZones.length}+</div>
                <div className="metric-label">Prohibited</div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action */}
        <Link href={`/lookup?city=${city}`} className="btn-primary inline-flex">
          <MapPin className="w-4 h-4" />
          Check Specific Address
        </Link>
      </header>

      {/* Permitted Zones */}
      {permittedZones.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-400" />
            <h2 className="text-xl font-semibold text-white">
              Zones Where {useConfig.name} is Permitted
            </h2>
          </div>
          <p className="text-sm text-gray-400">
            {useConfig.name} use is allowed by right in these zones. No conditional use permit required.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {permittedZones.map((zone) => (
              <Link
                key={zone.zone_code}
                href={`/zoning/${city}/${encodeURIComponent(zone.zone_code.toLowerCase())}`}
                className="use-permitted group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-white group-hover:text-green-300 transition-colors">
                      {zone.zone_code}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      {zone.max_height_ft && <span>{zone.max_height_ft} ft max</span>}
                      {zone.far && <span>FAR {zone.far}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-success">Permitted</span>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-green-400 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Conditional Zones */}
      {conditionalZones.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">
              Zones Where {useConfig.name} Requires Approval
            </h2>
          </div>
          <p className="text-sm text-gray-400">
            {useConfig.name} may be allowed in these zones with a Conditional Use Permit (CUP) or special approval.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {conditionalZones.map((zone) => (
              <Link
                key={zone.zone_code}
                href={`/zoning/${city}/${encodeURIComponent(zone.zone_code.toLowerCase())}`}
                className="use-conditional group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-mono font-bold text-white group-hover:text-yellow-300 transition-colors">
                      {zone.zone_code}
                    </div>
                    <div className="flex gap-3 mt-1 text-xs text-gray-500">
                      {zone.max_height_ft && <span>{zone.max_height_ft} ft max</span>}
                      {zone.far && <span>FAR {zone.far}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="badge-warning">Conditional</span>
                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-yellow-400 transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* No Results */}
      {totalFound === 0 && (
        <div className="card-glass p-12 text-center">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">
            No {useConfig.name} zones found
          </h3>
          <p className="text-gray-400 mb-4">
            We could not find zones explicitly allowing {useConfig.name.toLowerCase()} in {cityName}. 
            Try searching by address for more accurate results.
          </p>
          <Link href={`/lookup?city=${city}`} className="btn-primary">
            <MapPin className="w-4 h-4" />
            Lookup Address
          </Link>
        </div>
      )}

      {/* Related Use Types */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Related Use Types</h2>
        <div className="flex flex-wrap gap-3">
          {useConfig.relatedUses.map((related) => (
            <Link
              key={related}
              href={`/zoning/${city}/use/${related}`}
              className="btn-secondary"
            >
              {USE_TYPES[related]?.name || related}
              <ArrowRight className="w-4 h-4" />
            </Link>
          ))}
        </div>
      </section>

      {/* SEO Content */}
      <section className="card-glass p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">
          {useConfig.name} Development in {cityName}
        </h2>
        <div className="prose prose-invert prose-sm max-w-none text-gray-400">
          <p>
            {useConfig.name} development in {cityName} is governed by the city&apos;s zoning code, 
            which specifies where different commercial uses are allowed. Zones marked as 
            &ldquo;Permitted&rdquo; allow {useConfig.name.toLowerCase()} by right, meaning you can 
            develop this use type without special approval (subject to standard permits).
          </p>
          <p>
            Zones marked as &ldquo;Conditional&rdquo; may allow {useConfig.name.toLowerCase()}, 
            but require a Conditional Use Permit (CUP) or other discretionary approval. This 
            typically involves a public hearing and adds 2-6 months to the permit timeline.
          </p>
          <p>
            Before pursuing a {useConfig.name.toLowerCase()} project in {cityName}, we recommend:
          </p>
          <ul>
            <li>Verifying the exact zoning for your specific property address</li>
            <li>Reviewing dimensional limits (height, FAR, setbacks) for your zone</li>
            <li>Checking for overlay districts that may add requirements</li>
            <li>Understanding the permit pathway and typical timeline</li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="card-highlight p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="font-semibold text-white">Have a specific site in mind?</h3>
          <p className="text-sm text-gray-400">
            Upload your RFQ and we&apos;ll analyze if your {useConfig.name.toLowerCase()} project fits the site.
          </p>
        </div>
        <Link href="/fit-analysis/new" className="btn-primary whitespace-nowrap">
          Run Fit Analysis
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>
    </div>
  );
}

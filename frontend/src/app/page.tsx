import Link from "next/link";
import { 
  Search, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  Building2,
  Clock,
  FileText,
  Shield,
  Zap,
  Users,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  Scale,
} from "lucide-react";

// SEO-focused city data
const CITIES = [
  { 
    name: "Seattle", 
    slug: "seattle", 
    zones: 227, 
    popular: ["DMC", "NC3", "C1", "MIC"],
    description: "Downtown core, neighborhood commercial, industrial zones"
  },
  { 
    name: "Chicago", 
    slug: "chicago", 
    zones: 1522,
    popular: ["B3", "C1", "DX", "PMD"],
    description: "Business, commercial, downtown mixed-use districts"
  },
  { 
    name: "Austin", 
    slug: "austin", 
    zones: 33,
    popular: ["CBD", "DMU", "GR", "CS"],
    description: "Central business, downtown mixed-use, commercial"
  },
];

// Common use types for SEO
const USE_TYPES = [
  { name: "Office", slug: "office", icon: Building2, searches: "2.4K/mo" },
  { name: "Retail", slug: "retail", icon: Building2, searches: "1.8K/mo" },
  { name: "Restaurant", slug: "restaurant", icon: Building2, searches: "1.2K/mo" },
  { name: "Healthcare", slug: "healthcare", icon: Building2, searches: "890/mo" },
  { name: "Mixed-Use", slug: "mixed-use", icon: Building2, searches: "2.1K/mo" },
  { name: "Hotel", slug: "hotel", icon: Building2, searches: "650/mo" },
];

export default function HomePage() {
  return (
    <div className="space-y-24">
      {/* ============================================
          HERO: Address Search + Quick Actions
          ============================================ */}
      <section className="relative pt-8 pb-12">
        {/* Background */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-500/15 rounded-full blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-primary-500/10 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500"></span>
            </span>
            <span className="text-sm font-medium text-accent-300">Seattle • Chicago • Austin</span>
          </div>

          {/* Headline - Search Intent Focused */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-white leading-[1.1]">
              What can you build{" "}
              <span className="text-gradient">at this address?</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">
              Instant zoning lookup, permitted uses, height limits, and permit pathways 
              for commercial projects. Built for architects.
            </p>
          </div>

          {/* Primary CTA: Address Search */}
          <div className="card-glass p-6 max-w-2xl mx-auto">
            <form action="/lookup" method="GET" className="space-y-4">
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  name="address"
                  placeholder="Enter a property address..."
                  className="input-lg pl-12 pr-32"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary"
                >
                  <Search className="w-4 h-4" />
                  Lookup
                </button>
              </div>
              <div className="flex flex-wrap justify-center gap-2 text-xs text-gray-500">
                <span>Try:</span>
                <Link href="/lookup?address=600+Pine+St+Seattle+WA" className="text-accent-400 hover:text-accent-300">
                  600 Pine St, Seattle
                </Link>
                <span>•</span>
                <Link href="/lookup?address=233+S+Wacker+Dr+Chicago+IL" className="text-accent-400 hover:text-accent-300">
                  233 S Wacker Dr, Chicago
                </Link>
              </div>
            </form>
          </div>

          {/* Secondary CTAs */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/fit-analysis/new" className="btn-secondary">
              <Sparkles className="w-4 h-4" />
              Upload RFQ for Fit Analysis
            </Link>
            <Link href="/zoning/seattle" className="btn-ghost">
              Browse Zoning Codes
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
          BROWSE BY CITY (SEO Hub)
          ============================================ */}
      <section>
        <div className="section-header text-center">
          <p className="section-eyebrow">Browse by City</p>
          <h2 className="section-title">Commercial Zoning Codes</h2>
          <p className="section-subtitle mx-auto">
            Explore permitted uses, dimensional limits, and overlays for every zone.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {CITIES.map((city) => (
            <Link
              key={city.slug}
              href={`/zoning/${city.slug}`}
              className="card-interactive p-6 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-display font-bold text-white group-hover:text-accent-300 transition-colors">
                    {city.name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">{city.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-accent-400 group-hover:translate-x-1 transition-all" />
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Zone codes:</span>
                  <span className="font-semibold text-white">{city.zones.toLocaleString()}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {city.popular.map((zone) => (
                    <span key={zone} className="badge-neutral text-xs">
                      {zone}
                    </span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================
          BROWSE BY USE TYPE (SEO Landing)
          ============================================ */}
      <section>
        <div className="section-header text-center">
          <p className="section-eyebrow">Find Zones by Use</p>
          <h2 className="section-title">Where Can You Build?</h2>
          <p className="section-subtitle mx-auto">
            Find which zones allow your project type — permitted, conditional, or prohibited.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {USE_TYPES.map((use) => (
            <Link
              key={use.slug}
              href={`/zoning/seattle/use/${use.slug}`}
              className="card-interactive p-5 flex items-center gap-4 group"
            >
              <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400 group-hover:bg-accent-500/20 transition-colors">
                <use.icon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-white group-hover:text-accent-300 transition-colors">
                  {use.name}
                </div>
                <div className="text-xs text-gray-500">
                  See which zones allow {use.name.toLowerCase()}
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-accent-400 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </section>

      {/* ============================================
          VALUE PROPOSITION
          ============================================ */}
      <section className="card-glass p-8 lg:p-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="section-eyebrow">Why Part3</p>
            <h2 className="section-title">Zoning intelligence for commercial architects</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <ValueCard
              icon={<Zap className="w-6 h-6" />}
              title="Instant Zoning Lookup"
              description="Enter any address, get zone code, permitted uses, height limits, FAR, and overlays in seconds."
            />
            <ValueCard
              icon={<FileText className="w-6 h-6" />}
              title="RFQ Analysis"
              description="Upload a bid document. AI extracts requirements and cross-references against zoning to show fit."
            />
            <ValueCard
              icon={<AlertTriangle className="w-6 h-6" />}
              title="Risk Identification"
              description="Surface schedule risks early: design review, CUP requirements, SEPA triggers, and more."
            />
            <ValueCard
              icon={<Clock className="w-6 h-6" />}
              title="Permit Pathways"
              description="Understand the permit process before you commit. Typical timelines and required approvals."
            />
            <ValueCard
              icon={<Scale className="w-6 h-6" />}
              title="Code Citations"
              description="Every data point linked to source. Verify with official code, not guesswork."
            />
            <ValueCard
              icon={<Users className="w-6 h-6" />}
              title="Team Collaboration"
              description="Share reports with clients and consultants. Export PDF feasibility summaries."
            />
          </div>
        </div>
      </section>

      {/* ============================================
          HOW IT WORKS
          ============================================ */}
      <section>
        <div className="section-header text-center">
          <p className="section-eyebrow">How It Works</p>
          <h2 className="section-title">From address to feasibility in 3 steps</h2>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="timeline">
            <div className="timeline-item">
              <div className="timeline-dot">1</div>
              <div className="timeline-content">
                <h3 className="text-lg font-semibold text-white mb-2">Enter Address or Upload RFQ</h3>
                <p className="text-gray-400 text-sm">
                  Start with a property address for instant zoning lookup, or upload an RFQ document 
                  for AI-powered requirements extraction.
                </p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot">2</div>
              <div className="timeline-content">
                <h3 className="text-lg font-semibold text-white mb-2">Review Zoning Constraints</h3>
                <p className="text-gray-400 text-sm">
                  See permitted uses, dimensional limits, overlays, and red flags. Understand what 
                  requires standard permits vs. discretionary approval.
                </p>
              </div>
            </div>
            <div className="timeline-item">
              <div className="timeline-dot">3</div>
              <div className="timeline-content">
                <h3 className="text-lg font-semibold text-white mb-2">Get Fit Analysis & Risks</h3>
                <p className="text-gray-400 text-sm">
                  Cross-reference project requirements against zoning. Get a verdict (fits / conditional / conflicts), 
                  schedule risks, and actionable recommendations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================
          POPULAR SEARCHES (SEO + Social Proof)
          ============================================ */}
      <section>
        <div className="section-header text-center">
          <p className="section-eyebrow">Popular Searches</p>
          <h2 className="section-title">What architects are looking up</h2>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <PopularSearch query="DMC-125 Seattle" href="/zoning/seattle/dmc-125" />
          <PopularSearch query="NC3-65 height limit" href="/zoning/seattle/nc3-65" />
          <PopularSearch query="Chicago B3 zoning" href="/zoning/chicago/b3-2" />
          <PopularSearch query="Austin CBD office" href="/zoning/austin/use/office" />
          <PopularSearch query="Seattle design review" href="/guides/design-review-seattle" />
          <PopularSearch query="Mixed-use parking" href="/zoning/seattle/use/mixed-use" />
          <PopularSearch query="C1-40 permitted uses" href="/zoning/seattle/c1-40" />
          <PopularSearch query="FAR bonus Seattle" href="/guides/far-bonus-seattle" />
        </div>
      </section>

      {/* ============================================
          PART3 UPSELL
          ============================================ */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-accent-900/40 to-primary-900 border border-accent-500/20 p-8 md:p-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-accent-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-center gap-8">
          <div className="flex-1 space-y-4">
            <div className="badge-info">Coming Soon</div>
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
              Project passes zoning? Track it through CA.
            </h2>
            <p className="text-gray-300">
              Part3 picks up where feasibility ends. Manage permits, RFIs, submittals, and 
              field observations — with your zoning constraints and risks already loaded.
            </p>
            <ul className="space-y-2 text-sm text-gray-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-400" />
                Permit tracking & deadlines
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-400" />
                RFI management with AI drafts
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-400" />
                Submittal log & spec coordination
              </li>
            </ul>
          </div>
          <div className="flex-shrink-0">
            <Link href="/part3/waitlist" className="btn-primary-lg">
              Join Waitlist
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================
          FOOTER SEO LINKS
          ============================================ */}
      <section className="border-t border-white/10 pt-12">
        <div className="grid gap-8 md:grid-cols-4 text-sm">
          <div>
            <h4 className="font-semibold text-white mb-4">Seattle Zoning</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/zoning/seattle/dmc-125" className="hover:text-accent-400">DMC-125</Link></li>
              <li><Link href="/zoning/seattle/nc3-65" className="hover:text-accent-400">NC3-65</Link></li>
              <li><Link href="/zoning/seattle/c1-40" className="hover:text-accent-400">C1-40</Link></li>
              <li><Link href="/zoning/seattle" className="hover:text-accent-400">All Seattle zones →</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Chicago Zoning</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/zoning/chicago/b3-2" className="hover:text-accent-400">B3-2</Link></li>
              <li><Link href="/zoning/chicago/c1-2" className="hover:text-accent-400">C1-2</Link></li>
              <li><Link href="/zoning/chicago/dx-7" className="hover:text-accent-400">DX-7</Link></li>
              <li><Link href="/zoning/chicago" className="hover:text-accent-400">All Chicago zones →</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">By Use Type</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/zoning/seattle/use/office" className="hover:text-accent-400">Office zones</Link></li>
              <li><Link href="/zoning/seattle/use/retail" className="hover:text-accent-400">Retail zones</Link></li>
              <li><Link href="/zoning/seattle/use/mixed-use" className="hover:text-accent-400">Mixed-use zones</Link></li>
              <li><Link href="/zoning/seattle/use/healthcare" className="hover:text-accent-400">Healthcare zones</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">Tools</h4>
            <ul className="space-y-2 text-gray-400">
              <li><Link href="/lookup" className="hover:text-accent-400">Address Lookup</Link></li>
              <li><Link href="/fit-analysis/new" className="hover:text-accent-400">Fit Analysis</Link></li>
              <li><Link href="/tools/commercial-permit-pathway" className="hover:text-accent-400">Permit Pathway</Link></li>
              <li><Link href="/tools/commercial-risk-register" className="hover:text-accent-400">Risk Register</Link></li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

function ValueCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm text-gray-400">{description}</p>
      </div>
    </div>
  );
}

function PopularSearch({ query, href }: { query: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
    >
      <Search className="w-4 h-4 text-gray-500 group-hover:text-accent-400" />
      <span className="text-sm text-gray-300 group-hover:text-white">{query}</span>
    </Link>
  );
}

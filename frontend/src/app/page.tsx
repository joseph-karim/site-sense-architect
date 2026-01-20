import Link from "next/link";
import { 
  Upload, 
  MapPin, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  FileText,
  Building2,
  Clock,
  Zap,
  Shield,
  TrendingUp
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-24">
      {/* Hero Section - Tool First */}
      <section className="relative pt-8 pb-16">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-[128px]" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-500/15 rounded-full blur-[128px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500"></span>
            </span>
            <span className="text-sm font-medium text-accent-300">Seattle • Austin • Chicago</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-white leading-[1.1]">
              Does your project{" "}
              <span className="text-gradient">fit this site?</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Upload an RFQ or enter project details. We cross-reference with zoning constraints 
              to show you what works, what needs approval, and what won&apos;t fly.
            </p>
          </div>

          {/* Main CTA Card */}
          <div className="card-glass p-8 max-w-2xl mx-auto space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Link
                href="/fit-analysis/new"
                className="group relative flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-dashed border-accent-500/30 hover:border-accent-500/60 hover:bg-accent-500/5 transition-all cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-accent-500/20 flex items-center justify-center">
                  <Upload className="w-7 h-7 text-accent-400" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-white">Upload RFQ / Bid</div>
                  <div className="text-sm text-gray-400">PDF, Word, or paste text</div>
                </div>
                <ArrowRight className="absolute top-4 right-4 w-5 h-5 text-gray-600 group-hover:text-accent-400 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                href="/fit-analysis/new?mode=manual"
                className="group relative flex flex-col items-center gap-4 p-6 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all cursor-pointer"
              >
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                  <MapPin className="w-7 h-7 text-gray-400" />
                </div>
                <div className="text-center">
                  <div className="font-semibold text-white">Enter Manually</div>
                  <div className="text-sm text-gray-400">Address + project details</div>
                </div>
                <ArrowRight className="absolute top-4 right-4 w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </Link>
            </div>

            <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-500 pt-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-500" />
                Free analysis
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-500" />
                PDF export included
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-accent-500" />
                No account required
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* What You Get */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
            From RFQ to feasibility verdict in minutes
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            We extract project requirements and cross-reference against site-specific zoning constraints.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<FileText className="w-6 h-6" />}
            step={1}
            title="Extract Requirements"
            description="We parse your RFQ to identify: proposed use, target SF, height needs, parking requirements, and timeline expectations."
            accentColor="accent"
          />
          <FeatureCard
            icon={<MapPin className="w-6 h-6" />}
            step={2}
            title="Lookup Zoning"
            description="GIS intersection identifies the zone, overlays, and dimensional limits for your specific address."
            accentColor="info"
          />
          <FeatureCard
            icon={<CheckCircle2 className="w-6 h-6" />}
            step={3}
            title="Fit Analysis"
            description="We show what's permitted, what needs conditional approval, and what conflicts with zoning — with risk ratings."
            accentColor="warning"
          />
        </div>
      </section>

      {/* Example Output */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
            Instant clarity on project fit
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            No more guessing. Know exactly where your project stands before you respond to the RFQ.
          </p>
        </div>

        <div className="card-glass p-6 md:p-8 max-w-3xl mx-auto">
          {/* Mock Analysis Result */}
          <div className="space-y-6">
            {/* Verdict Banner */}
            <div className="flex items-center gap-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <div className="font-semibold text-green-300 text-lg">Project Fits This Site</div>
                <div className="text-sm text-green-400/80">Primary use permitted • 2 schedule risks identified</div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
              <MetricCard label="Zone" value="DMC-125" />
              <MetricCard label="Use Status" value="Permitted" valueColor="text-green-400" />
              <MetricCard label="Height Ask" value="85 ft" subValue="125 ft allowed" />
              <MetricCard label="FAR Ask" value="4.2" subValue="8.0 allowed" />
            </div>

            {/* Conflicts */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-white uppercase tracking-wide">Risk Items</h4>
              <div className="space-y-2">
                <RiskItem 
                  severity="yellow" 
                  title="Design Review Required" 
                  description="Projects over 4,000 SF require Downtown Design Review Board approval (+8-12 weeks)"
                />
                <RiskItem 
                  severity="yellow" 
                  title="SEPA Threshold" 
                  description="85 ft triggers SEPA environmental review in this zone"
                />
                <RiskItem 
                  severity="green" 
                  title="Parking" 
                  description="No minimum parking required in DMC zones — RFQ asks for 50 stalls (permitted)"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
            Built for architect workflows
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <UseCaseCard
            icon={<Building2 className="w-5 h-5" />}
            title="RFQ Response"
            description="Quickly assess if you can deliver what the owner wants on their selected site."
          />
          <UseCaseCard
            icon={<TrendingUp className="w-5 h-5" />}
            title="Site Comparison"
            description="Compare multiple sites for the same program to find the best fit."
          />
          <UseCaseCard
            icon={<Clock className="w-5 h-5" />}
            title="Timeline Planning"
            description="Understand permit pathway duration before committing to project schedules."
          />
          <UseCaseCard
            icon={<AlertTriangle className="w-5 h-5" />}
            title="Risk Register Seed"
            description="Export identified risks directly into your project risk register."
          />
          <UseCaseCard
            icon={<Shield className="w-5 h-5" />}
            title="Due Diligence"
            description="Verify developer's assumptions about what's buildable before signing on."
          />
          <UseCaseCard
            icon={<Zap className="w-5 h-5" />}
            title="Client Memo"
            description="Generate a professional feasibility summary to share with stakeholders."
          />
        </div>
      </section>

      {/* Part3 Upsell */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-900/80 to-primary-950 border border-white/10 p-8 md:p-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-accent-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="flex-1 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-gray-300">
                Coming Soon
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
                Project fits? Track it through CA.
              </h2>
              <p className="text-gray-300">
                Part3 picks up where feasibility ends. Manage permits, RFIs, submittals, and field observations 
                — with your zoning constraints and risks already loaded.
              </p>
              <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-500" />
                  Permit tracking
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-500" />
                  RFI management
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-accent-500" />
                  Submittal log
                </span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Link
                href="/part3"
                className="btn-primary text-base px-8 py-4 inline-flex"
              >
                Join Waitlist
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Browse by City */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
            Browse zoning by city
          </h2>
          <p className="text-gray-400">
            Explore zone codes, permitted uses, and dimensional limits.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <CityCard city="Seattle" zones={227} href="/commercial-zoning/seattle" />
          <CityCard city="Chicago" zones={1522} href="/commercial-zoning/chicago" />
          <CityCard city="Austin" zones={33} href="/commercial-zoning/austin" />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  step,
  title,
  description,
  accentColor,
}: {
  icon: React.ReactNode;
  step: number;
  title: string;
  description: string;
  accentColor: "accent" | "info" | "warning";
}) {
  const colorMap = {
    accent: "bg-accent-500/10 text-accent-400 border-accent-500/20",
    info: "bg-info-500/10 text-info-400 border-info-500/20",
    warning: "bg-warning-500/10 text-warning-400 border-warning-500/20",
  };

  return (
    <div className="relative card-glass p-6 space-y-4">
      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm font-bold text-gray-500">
        {step}
      </div>
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg border ${colorMap[accentColor]}`}>
        {icon}
      </div>
      <h3 className="text-lg font-display font-semibold text-white">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function MetricCard({ label, value, subValue, valueColor = "text-white" }: { 
  label: string; 
  value: string; 
  subValue?: string;
  valueColor?: string;
}) {
  return (
    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{label}</div>
      <div className={`text-lg font-semibold ${valueColor}`}>{value}</div>
      {subValue && <div className="text-xs text-gray-500">{subValue}</div>}
    </div>
  );
}

function RiskItem({ severity, title, description }: { 
  severity: "red" | "yellow" | "green"; 
  title: string; 
  description: string;
}) {
  const colors = {
    red: "bg-red-500/10 border-red-500/20 text-red-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    green: "bg-green-500/10 border-green-500/20 text-green-400",
  };
  const icons = {
    red: <AlertTriangle className="w-4 h-4" />,
    yellow: <AlertTriangle className="w-4 h-4" />,
    green: <CheckCircle2 className="w-4 h-4" />,
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${colors[severity]}`}>
      <div className="mt-0.5">{icons[severity]}</div>
      <div>
        <div className="font-medium text-white text-sm">{title}</div>
        <div className="text-xs text-gray-400">{description}</div>
      </div>
    </div>
  );
}

function UseCaseCard({ icon, title, description }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-gray-400 flex-shrink-0">
        {icon}
      </div>
      <div>
        <div className="font-medium text-white">{title}</div>
        <div className="text-sm text-gray-400">{description}</div>
      </div>
    </div>
  );
}

function CityCard({ city, zones, href }: { city: string; zones: number; href: string }) {
  return (
    <Link 
      href={href}
      className="group flex items-center justify-between p-5 rounded-xl border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all"
    >
      <div>
        <div className="font-display font-semibold text-white text-lg">{city}</div>
        <div className="text-sm text-gray-400">{zones.toLocaleString()} zone codes</div>
      </div>
      <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

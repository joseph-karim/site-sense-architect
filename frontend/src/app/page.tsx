import Link from "next/link";
import { Building2, FileText, AlertTriangle, ArrowRight, MapPin, Clock, CheckCircle2 } from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-20">
      {/* Hero Section */}
      <section className="relative">
        {/* Background gradient */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-accent-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-primary-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-3xl mx-auto text-center space-y-8 pt-8 pb-12">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-500/10 border border-accent-500/20">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-500"></span>
            </span>
            <span className="text-sm font-medium text-accent-300">Now covering Seattle, Austin &amp; Chicago</span>
          </div>

          {/* Headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-white leading-tight">
              Can you build{" "}
              <span className="text-gradient">this here?</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              Get instant zoning constraints, permit pathways, and code requirements for any address. 
              No more guessing. No more surprises.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/tools/commercial-zoning-snapshot"
              className="btn-primary text-base px-8 py-4 group"
            >
              <MapPin className="w-5 h-5" />
              Enter Address
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/tools/corridor-width-checker"
              className="btn-secondary text-base px-8 py-4"
            >
              <AlertTriangle className="w-5 h-5" />
              Run Tripwire Checklist
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent-500" />
              Free to use
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent-500" />
              Real municipal data
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-accent-500" />
              PDF export included
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="space-y-8">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
            Three artifacts. One workflow.
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Generate professional reports instantly — each one designed for different stakeholders in your project.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Building2 className="w-6 h-6" />}
            title="Zoning Snapshot"
            description="Zone code, allowed uses, height limits, FAR, setbacks, overlay districts, and red flags — all in one view."
            href="/commercial-zoning/seattle"
            metrics={[
              { label: "Key metrics", value: "6+" },
              { label: "Overlay detection", value: "Yes" },
            ]}
            accentColor="accent"
          />
          <FeatureCard
            icon={<FileText className="w-6 h-6" />}
            title="Permit Pathway"
            description="Required permits, review sequence, typical durations, and P50/P90 timeline estimates based on real data."
            href="/commercial-permits/seattle"
            metrics={[
              { label: "Timeline range", value: "P50/P90" },
              { label: "Historical data", value: "Yes" },
            ]}
            accentColor="info"
          />
          <FeatureCard
            icon={<AlertTriangle className="w-6 h-6" />}
            title="Code Tripwires"
            description="Top 10 issues that trigger RFIs — with IBC, ADA, and IPC references. Catch problems before submittal."
            href="/tools/corridor-width-checker"
            metrics={[
              { label: "RFI triggers", value: "10" },
              { label: "Code refs", value: "IBC/ADA" },
            ]}
            accentColor="warning"
          />
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
            How it works
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Three simple steps to get the intelligence you need.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <StepCard
            number={1}
            title="Enter an address"
            description="Type any address or click directly on our interactive map to select a location."
          />
          <StepCard
            number={2}
            title="Select intended use"
            description="Choose your commercial use type: office, retail, mixed-use, healthcare, education, or civic."
          />
          <StepCard
            number={3}
            title="Get your reports"
            description="Instantly receive zoning constraints, permit pathways, and code tripwires — with PDF export."
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-900 to-primary-950 border border-white/10 p-8 md:p-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-accent-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
            Ready to run your first analysis?
          </h2>
          <p className="text-gray-300">
            Enter any address in Seattle, Austin, or Chicago and get instant zoning intelligence.
          </p>
          <Link
            href="/tools/commercial-zoning-snapshot"
            className="btn-primary text-base px-8 py-4 inline-flex"
          >
            <MapPin className="w-5 h-5" />
            Start Now — It&apos;s Free
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  href,
  metrics,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  metrics: { label: string; value: string }[];
  accentColor: "accent" | "info" | "warning";
}) {
  const colorMap = {
    accent: {
      bg: "bg-accent-500/10",
      border: "border-accent-500/20",
      text: "text-accent-400",
      hover: "hover:border-accent-500/40",
    },
    info: {
      bg: "bg-info-500/10",
      border: "border-info-500/20",
      text: "text-info-400",
      hover: "hover:border-info-500/40",
    },
    warning: {
      bg: "bg-warning-500/10",
      border: "border-warning-500/20",
      text: "text-warning-400",
      hover: "hover:border-warning-500/40",
    },
  };

  const colors = colorMap[accentColor];

  return (
    <Link
      href={href}
      className={`group relative block rounded-xl border ${colors.border} ${colors.hover} bg-white/5 p-6 transition-all hover:bg-white/[0.07] hover:shadow-lg`}
    >
      {/* Icon */}
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${colors.bg} ${colors.text} mb-4`}>
        {icon}
      </div>

      {/* Content */}
      <h3 className="text-lg font-display font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed mb-4">{description}</p>

      {/* Metrics */}
      <div className="flex gap-4 pt-4 border-t border-white/10">
        {metrics.map((metric, i) => (
          <div key={i}>
            <div className="text-xs text-gray-500 uppercase tracking-wide">{metric.label}</div>
            <div className="text-sm font-semibold text-white">{metric.value}</div>
          </div>
        ))}
      </div>

      {/* Arrow */}
      <div className="absolute top-6 right-6 text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all">
        <ArrowRight className="w-5 h-5" />
      </div>
    </Link>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="relative text-center">
      {/* Number badge */}
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-accent-500/20 border border-accent-500/30 text-accent-400 font-display font-bold text-lg mb-4">
        {number}
      </div>

      {/* Content */}
      <h3 className="text-lg font-display font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

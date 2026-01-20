import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Zoning Lookup by Address | Find Zone Code, Permitted Uses & Limits",
  description: "Enter any address to instantly find its zoning district, permitted uses, height limits, FAR, setbacks, and overlay requirements. Free zoning lookup tool.",
  openGraph: {
    title: "Zoning Lookup by Address",
    description: "Instant zoning lookup for any property. Find zone code, permitted uses, and dimensional limits.",
  },
};

const cities = [
  {
    slug: "seattle",
    name: "Seattle",
    state: "Washington",
    coverage: "216 zoning districts",
    description: "Full GIS polygon coverage of Seattle's zoning map including downtown, neighborhoods, and industrial zones.",
    image: "/images/seattle.jpg",
  },
  {
    slug: "chicago",
    name: "Chicago",
    state: "Illinois", 
    coverage: "1,519 zoning districts",
    description: "Comprehensive coverage of Chicago's complex zoning system including PDs, business districts, and residential zones.",
    image: "/images/chicago.jpg",
  },
  {
    slug: "austin",
    name: "Austin",
    state: "Texas",
    coverage: "100,000+ addresses",
    description: "Address-level zoning lookup for Austin properties. Search by street address for instant zoning information.",
    image: "/images/austin.jpg",
  },
];

export default function LookupPage() {
  return (
    <main className="min-h-screen bg-surface-default">
      {/* Hero */}
      <section className="bg-gradient-to-br from-surface-elevated via-surface-default to-surface-subtle border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-sm font-medium text-accent-primary uppercase tracking-wider mb-3">
              Zoning Lookup Tool
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              Find Zoning by Address
            </h1>
            <p className="mt-4 text-lg text-text-secondary">
              Select a city to look up zoning information for any address. 
              Get instant access to zone codes, permitted uses, height limits, and more.
            </p>
          </div>
        </div>
      </section>

      {/* City Selection */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-primary mb-8 text-center">
            Select Your City
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {cities.map((city) => (
              <Link
                key={city.slug}
                href={`/lookup/${city.slug}`}
                className="group card-base hover:border-accent-primary/50 transition-all duration-200 overflow-hidden"
              >
                {/* City Image/Gradient */}
                <div className="h-32 bg-gradient-to-br from-accent-primary/20 to-accent-secondary/20 relative">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-accent-primary/30">
                      {city.name[0]}
                    </span>
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex items-baseline gap-2 mb-2">
                    <h3 className="text-xl font-bold text-text-primary group-hover:text-accent-primary transition-colors">
                      {city.name}
                    </h3>
                    <span className="text-sm text-text-tertiary">{city.state}</span>
                  </div>
                  
                  <p className="text-sm text-text-secondary mb-4">
                    {city.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-accent-primary bg-accent-primary/10 px-2 py-1 rounded">
                      {city.coverage}
                    </span>
                    <span className="text-sm text-accent-primary font-medium group-hover:translate-x-1 transition-transform">
                      Lookup →
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-surface-subtle border-t border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-text-primary mb-8 text-center">
            How It Works
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-accent-primary">1</span>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Select City</h3>
              <p className="text-sm text-text-secondary">
                Choose from Seattle, Chicago, or Austin to access city-specific zoning data.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-accent-primary">2</span>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Enter Address or Click Map</h3>
              <p className="text-sm text-text-secondary">
                Type an address or click directly on the interactive map to select a location.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-accent-primary/10 flex items-center justify-center">
                <span className="text-xl font-bold text-accent-primary">3</span>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Get Zoning Info</h3>
              <p className="text-sm text-text-secondary">
                Instantly see zone code, permitted uses, height limits, FAR, setbacks, and overlays.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data Sources */}
      <section className="py-16 border-t border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-text-primary mb-4">
              Official Data Sources
            </h2>
            <p className="text-sm text-text-secondary">
              Our zoning data comes directly from official city GIS systems and open data portals. 
              Seattle and Chicago use GIS polygon boundaries for precise location matching. 
              Austin uses the official address-to-zoning database with 100,000+ indexed addresses.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

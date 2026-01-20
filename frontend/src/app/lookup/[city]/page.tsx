import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Cities, CityNames, isCity } from "@/lib/cities";
import CityLookupClient from "@/components/CityLookupClient";

interface Props {
  params: { city: string };
}

export function generateStaticParams() {
  return Cities.map((city) => ({ city }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const city = params.city.toLowerCase();
  if (!isCity(city)) return {};

  const cityName = CityNames[city];
  return {
    title: `${cityName} Zoning Lookup | Find Zone by Address`,
    description: `Look up zoning codes for any address in ${cityName}. Get instant access to permitted uses, height limits, FAR, setbacks, and more.`,
    openGraph: {
      title: `${cityName} Zoning Lookup`,
      description: `Interactive zoning map and address lookup for ${cityName}`,
    },
  };
}

export default function CityLookupPage({ params }: Props) {
  const city = params.city.toLowerCase();
  if (!isCity(city)) notFound();

  const cityName = CityNames[city];
  
  // City-specific bounds for the map
  const cityBounds: Record<string, { center: [number, number]; zoom: number }> = {
    seattle: { center: [-122.3321, 47.6062], zoom: 11 },
    chicago: { center: [-87.6298, 41.8781], zoom: 10 },
    austin: { center: [-97.7431, 30.2672], zoom: 11 },
  };

  const bounds = cityBounds[city];

  return (
    <main className="min-h-screen bg-surface-default">
      {/* Header */}
      <section className="bg-gradient-to-br from-surface-elevated via-surface-default to-surface-subtle border-b border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-medium text-accent-primary uppercase tracking-wider mb-2">
              Zoning Lookup
            </p>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary sm:text-5xl">
              {cityName} Zoning Map
            </h1>
            <p className="mt-4 text-lg text-text-secondary max-w-2xl mx-auto">
              Click anywhere on the map or enter an address to find zoning information.
              Get instant access to permitted uses, height limits, and development rules.
            </p>
          </div>
        </div>
      </section>

      {/* Map and Lookup Tool */}
      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <CityLookupClient 
            city={city} 
            cityName={cityName}
            initialCenter={bounds.center}
            initialZoom={bounds.zoom}
          />
        </div>
      </section>

      {/* Info Section */}
      <section className="py-12 border-t border-border-subtle">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="card-base p-6">
              <div className="w-10 h-10 rounded-lg bg-accent-primary/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-accent-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Click to Lookup</h3>
              <p className="text-sm text-text-secondary">
                Click anywhere on the map to instantly see the zoning district for that location.
              </p>
            </div>

            <div className="card-base p-6">
              <div className="w-10 h-10 rounded-lg bg-accent-secondary/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-accent-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Search by Address</h3>
              <p className="text-sm text-text-secondary">
                Type any {cityName} address to geocode and find its zoning designation.
              </p>
            </div>

            <div className="card-base p-6">
              <div className="w-10 h-10 rounded-lg bg-status-success/10 flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-status-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary mb-2">Verified Data</h3>
              <p className="text-sm text-text-secondary">
                {city === "austin" 
                  ? "100,000+ addresses indexed from official Austin zoning records."
                  : `Official ${cityName} zoning polygons with full coverage.`}
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

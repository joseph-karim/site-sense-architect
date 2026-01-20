import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Building2, MapPin, FileText, Sparkles, ChevronDown } from "lucide-react";

export const metadata: Metadata = {
  title: {
    default: "Part3 — Commercial Zoning Intelligence for Architects",
    template: "%s | Part3",
  },
  description:
    "Instant zoning lookup, permitted uses, height limits, and permit pathways for commercial projects. Built for architects pursuing entitlements.",
  keywords: [
    "zoning lookup",
    "commercial zoning",
    "permitted uses",
    "height limits",
    "FAR",
    "architect tools",
    "entitlement",
    "permit pathway",
  ],
};

const CITIES = [
  { name: "Seattle", slug: "seattle" },
  { name: "Chicago", slug: "chicago" },
  { name: "Austin", slug: "austin" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@200..800&family=Inter:wght@100..900&family=JetBrains+Mono:wght@100..800&display=swap"
        />
      </head>
      <body className="min-h-screen bg-primary-950 text-gray-100 font-body antialiased">
        {/* Skip link */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-primary-900 focus:p-4 focus:rounded-lg"
        >
          Skip to main content
        </a>

        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-primary-950/90 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-8">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 shadow-glow">
                <span className="font-display font-bold text-white">P3</span>
              </div>
              <span className="font-display font-semibold text-lg tracking-tight text-white group-hover:text-accent-300 transition-colors">
                Part3
              </span>
            </Link>

            {/* Main Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/lookup" className="nav-link">
                <MapPin className="w-4 h-4" />
                Address Lookup
              </Link>
              
              {/* Zoning Dropdown */}
              <div className="relative group">
                <button className="nav-link">
                  <Building2 className="w-4 h-4" />
                  Zoning
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute top-full left-0 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="card-glass p-2 min-w-[200px] shadow-xl">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
                      By City
                    </div>
                    {CITIES.map((city) => (
                      <Link
                        key={city.slug}
                        href={`/zoning/${city.slug}`}
                        className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        {city.name}
                      </Link>
                    ))}
                    <div className="border-t border-white/10 mt-2 pt-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 py-2">
                        By Use Type
                      </div>
                      <Link
                        href="/zoning/seattle/use/office"
                        className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        Office
                      </Link>
                      <Link
                        href="/zoning/seattle/use/retail"
                        className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        Retail
                      </Link>
                      <Link
                        href="/zoning/seattle/use/mixed-use"
                        className="block px-3 py-2 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        Mixed-Use
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <Link href="/permits/seattle" className="nav-link">
                <FileText className="w-4 h-4" />
                Permits
              </Link>
            </nav>

            {/* CTA */}
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-2 text-sm text-gray-400 border-r border-white/10 pr-4 mr-2">
                {CITIES.map((city) => (
                  <Link
                    key={city.slug}
                    href={`/zoning/${city.slug}`}
                    className="px-2 py-1 rounded hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {city.name}
                  </Link>
                ))}
              </div>
              <Link href="/fit-analysis/new" className="btn-primary text-sm py-2">
                <Sparkles className="w-4 h-4" />
                Fit Analysis
              </Link>
            </div>
          </div>
        </header>

        {/* Main */}
        <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 lg:px-8 lg:py-12">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-primary-950">
          <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
            <div className="grid gap-8 md:grid-cols-4">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/20">
                    <span className="font-display font-bold text-accent-400 text-sm">P3</span>
                  </div>
                  <span className="font-display font-semibold text-white">Part3</span>
                </div>
                <p className="text-sm text-gray-400">
                  Zoning intelligence for commercial architects.
                </p>
              </div>

              {/* Tools */}
              <div>
                <h4 className="font-semibold text-white mb-4">Tools</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>
                    <Link href="/lookup" className="hover:text-accent-400 transition-colors">
                      Address Lookup
                    </Link>
                  </li>
                  <li>
                    <Link href="/fit-analysis/new" className="hover:text-accent-400 transition-colors">
                      Fit Analysis
                    </Link>
                  </li>
                  <li>
                    <Link href="/tools/commercial-permit-pathway" className="hover:text-accent-400 transition-colors">
                      Permit Pathway
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Zoning */}
              <div>
                <h4 className="font-semibold text-white mb-4">Zoning by City</h4>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>
                    <Link href="/zoning/seattle" className="hover:text-accent-400 transition-colors">
                      Seattle Zoning
                    </Link>
                  </li>
                  <li>
                    <Link href="/zoning/chicago" className="hover:text-accent-400 transition-colors">
                      Chicago Zoning
                    </Link>
                  </li>
                  <li>
                    <Link href="/zoning/austin" className="hover:text-accent-400 transition-colors">
                      Austin Zoning
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h4 className="font-semibold text-white mb-4">About</h4>
                <p className="text-sm text-gray-400">
                  Commercial projects only. Verify all information with local authorities before relying on it.
                </p>
              </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/10 text-center text-xs text-gray-500">
              © {new Date().getFullYear()} Part3. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

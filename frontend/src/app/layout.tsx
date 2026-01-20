import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Building2, FileText, Sparkles, Map } from "lucide-react";

export const metadata: Metadata = {
  title: "Part3 — Entitlement Intelligence",
  description:
    "Commercial entitlement intelligence: zoning constraints, permit pathways, and code tripwires — turned into real artifacts (web + PDF)."
};

const cities = [
  { name: "Seattle", slug: "seattle" },
  { name: "Austin", slug: "austin" },
  { name: "Chicago", slug: "chicago" },
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
        {/* Skip link for accessibility */}
        <a 
          href="#main-content" 
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-primary-900 focus:p-4 focus:rounded-lg focus:shadow-lg"
        >
          Skip to main content
        </a>

        {/* Header with glass morphism */}
        <header className="sticky top-0 z-50 border-b border-white/10 bg-primary-950/80 backdrop-blur-lg">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 lg:px-8">
            {/* Logo */}
            <Link href="/" className="group flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-500 shadow-glow">
                <span className="font-display font-bold text-white">P3</span>
              </div>
              <span className="font-display font-semibold text-lg tracking-tight text-white group-hover:text-accent-300 transition-colors">
                Part3
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <NavLink href="/fit-analysis/new" icon={<Sparkles className="w-4 h-4" />}>
                Fit Analysis
              </NavLink>
              <NavLink href="/commercial-zoning/seattle" icon={<Building2 className="w-4 h-4" />}>
                Zoning
              </NavLink>
              <NavLink href="/commercial-permits/seattle" icon={<FileText className="w-4 h-4" />}>
                Permits
              </NavLink>
              <NavLink href="/tools/commercial-zoning-snapshot" icon={<Map className="w-4 h-4" />}>
                Address Lookup
              </NavLink>
            </nav>

            {/* City selector + CTA */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-400">
                {cities.map((city) => (
                  <Link
                    key={city.slug}
                    href={`/commercial-zoning/${city.slug}`}
                    className="px-2 py-1 rounded hover:text-white hover:bg-white/10 transition-colors"
                  >
                    {city.name}
                  </Link>
                ))}
              </div>
              <Link
                href="/fit-analysis/new"
                className="btn-primary text-sm py-2"
              >
                <Sparkles className="w-4 h-4" />
                Project Fit
              </Link>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main id="main-content" className="mx-auto max-w-6xl px-4 py-10 lg:px-8 lg:py-16">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/10 bg-primary-950">
          <div className="mx-auto max-w-6xl px-4 py-12 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              {/* Brand */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-500/20">
                    <span className="font-display font-bold text-accent-400 text-sm">P3</span>
                  </div>
                  <span className="font-display font-semibold text-white">Part3</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Entitlement intelligence for architects, developers, and real estate professionals.
                </p>
              </div>

              {/* Quick links */}
              <div>
                <h4 className="font-display font-semibold text-white mb-4">Tools</h4>
                <div className="flex flex-col gap-2">
                  <Link href="/fit-analysis/new" className="text-sm text-gray-400 hover:text-accent-400 transition-colors">
                    Project Fit Analysis
                  </Link>
                  <Link href="/tools/commercial-zoning-snapshot" className="text-sm text-gray-400 hover:text-accent-400 transition-colors">
                    Address Lookup
                  </Link>
                  <Link href="/commercial-zoning/seattle" className="text-sm text-gray-400 hover:text-accent-400 transition-colors">
                    Browse Zoning Codes
                  </Link>
                </div>
              </div>

              {/* Legal */}
              <div>
                <h4 className="font-display font-semibold text-white mb-4">Legal</h4>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Scope: commercial and institutional projects only (office, retail, mixed-use, healthcare, education, civic). Residential-only projects are intentionally excluded. This platform is for informational purposes only; verify with local authorities.
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

function NavLink({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-all"
    >
      {icon}
      {children}
    </Link>
  );
}

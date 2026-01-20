import { Metadata } from "next";
import { Suspense } from "react";
import { AddressLookupClient } from "@/components/AddressLookupClient";

export const metadata: Metadata = {
  title: "Zoning Lookup by Address | Find Zone Code, Permitted Uses & Limits",
  description: "Enter any address to instantly find its zoning district, permitted uses, height limits, FAR, setbacks, and overlay requirements. Free zoning lookup tool.",
  openGraph: {
    title: "Zoning Lookup by Address",
    description: "Instant zoning lookup for any property. Find zone code, permitted uses, and dimensional limits.",
  },
};

export default function LookupPage() {
  const mapboxToken = process.env.MAPBOX_TOKEN;

  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    }>
      <AddressLookupClient mapboxToken={mapboxToken} />
    </Suspense>
  );
}

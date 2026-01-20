import type { Metadata } from "next";
import { Suspense } from "react";
import { FitAnalysisClient } from "@/components/FitAnalysisClient";

export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Project Fit Analysis | Part3",
  description:
    "Upload an RFQ or enter project details to analyze how your project fits with site-specific zoning constraints."
};

export default function FitAnalysisNewPage() {
  const mapboxToken = process.env.MAPBOX_TOKEN;

  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    }>
      <FitAnalysisClient mapboxToken={mapboxToken} />
    </Suspense>
  );
}

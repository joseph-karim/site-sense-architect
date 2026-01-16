import { redirect } from "next/navigation";

export default async function ZoningUseRedirectPage({ params }: { params: Promise<{ city: string; useType: string }> }) {
  const { city, useType } = await params;
  redirect(`/commercial-snapshots/${city}/${useType}`);
}

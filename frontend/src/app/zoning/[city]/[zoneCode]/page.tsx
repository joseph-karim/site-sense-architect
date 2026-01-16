import { redirect } from "next/navigation";

export default async function ZoningZoneRedirectPage({ params }: { params: Promise<{ city: string; zoneCode: string }> }) {
  const { city, zoneCode } = await params;
  redirect(`/commercial-zoning/${city}/${zoneCode}`);
}

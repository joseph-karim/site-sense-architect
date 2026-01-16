import { redirect } from "next/navigation";

export default function ZoningZoneRedirectPage({ params }: { params: { city: string; zoneCode: string } }) {
  redirect(`/commercial-zoning/${params.city}/${params.zoneCode}`);
}

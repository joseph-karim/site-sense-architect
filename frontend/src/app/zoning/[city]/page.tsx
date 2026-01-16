import { redirect } from "next/navigation";

export default async function ZoningRedirectPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  redirect(`/commercial-zoning/${city}`);
}

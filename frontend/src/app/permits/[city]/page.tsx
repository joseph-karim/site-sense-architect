import { redirect } from "next/navigation";

export default async function PermitsRedirectPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  redirect(`/commercial-permits/${city}`);
}

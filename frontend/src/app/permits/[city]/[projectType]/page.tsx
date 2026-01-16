import { redirect } from "next/navigation";

export default async function PermitProjectTypeRedirectPage({
  params
}: {
  params: Promise<{ city: string; projectType: string }>;
}) {
  const { city, projectType } = await params;
  redirect(`/commercial-permits/${city}?project_type=${projectType}`);
}

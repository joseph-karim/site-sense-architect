import { redirect } from "next/navigation";

export default function PermitProjectTypeRedirectPage({
  params
}: {
  params: { city: string; projectType: string };
}) {
  redirect(`/commercial-permits/${params.city}?project_type=${params.projectType}`);
}

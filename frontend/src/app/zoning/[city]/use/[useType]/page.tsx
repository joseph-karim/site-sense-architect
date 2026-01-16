import { redirect } from "next/navigation";

export default function ZoningUseRedirectPage({ params }: { params: { city: string; useType: string } }) {
  redirect(`/commercial-snapshots/${params.city}/${params.useType}`);
}

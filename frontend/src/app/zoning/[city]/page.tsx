import { redirect } from "next/navigation";

export default function ZoningRedirectPage({ params }: { params: { city: string } }) {
  redirect(`/commercial-zoning/${params.city}`);
}

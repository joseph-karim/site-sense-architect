import { redirect } from "next/navigation";

export default function PermitsRedirectPage({ params }: { params: { city: string } }) {
  redirect(`/commercial-permits/${params.city}`);
}

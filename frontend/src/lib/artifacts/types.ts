import { z } from "zod";

export const ArtifactTypeSchema = z.enum([
  "zoning_snapshot",
  "permit_pathway",
  "tripwire_checklist",
  "risk_register",
  "kickoff_pack"
]);
export type ArtifactType = z.infer<typeof ArtifactTypeSchema>;

export type ArtifactRecord = {
  id: string;
  type: ArtifactType;
  address_id?: string | null;
  city: string;
  input_params: Record<string, unknown>;
  output_data: Record<string, unknown>;
  pdf_url: string | null;
  web_slug: string;
  created_at: string;
  user_email: string | null;
};

import { ArtifactRecord, ArtifactType } from "@/lib/artifacts/types";

export type CreateArtifactInput = {
  type: ArtifactType;
  address_id?: string | null;
  city: string;
  input_params: Record<string, unknown>;
  output_data: Record<string, unknown>;
  web_slug: string;
  user_email?: string | null;
  pdf_url?: string | null;
};

export interface ArtifactStore {
  create(input: CreateArtifactInput): Promise<ArtifactRecord>;
  getById(id: string): Promise<ArtifactRecord | null>;
  getBySlug(slug: string): Promise<ArtifactRecord | null>;
}

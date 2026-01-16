import { ArtifactRecord } from "@/lib/artifacts/types";
import { ArtifactStore, CreateArtifactInput } from "@/lib/storage/artifacts";

type State = {
  byId: Map<string, ArtifactRecord>;
  bySlug: Map<string, ArtifactRecord>;
};

declare global {
  // eslint-disable-next-line no-var
  var __artifactMemoryStore: State | undefined;
}

function getState(): State {
  if (!globalThis.__artifactMemoryStore) {
    globalThis.__artifactMemoryStore = { byId: new Map(), bySlug: new Map() };
  }
  return globalThis.__artifactMemoryStore;
}

export class MemoryArtifactStore implements ArtifactStore {
  async create(input: CreateArtifactInput): Promise<ArtifactRecord> {
    const id = crypto.randomUUID();
    const created_at = new Date().toISOString();
    const record: ArtifactRecord = {
      id,
      type: input.type,
      address_id: input.address_id ?? null,
      city: input.city,
      input_params: input.input_params,
      output_data: input.output_data,
      pdf_url: input.pdf_url ?? null,
      web_slug: input.web_slug,
      created_at,
      user_email: input.user_email ?? null
    };

    const state = getState();
    state.byId.set(id, record);
    state.bySlug.set(record.web_slug, record);
    return record;
  }

  async getById(id: string): Promise<ArtifactRecord | null> {
    return getState().byId.get(id) ?? null;
  }

  async getBySlug(slug: string): Promise<ArtifactRecord | null> {
    return getState().bySlug.get(slug) ?? null;
  }
}

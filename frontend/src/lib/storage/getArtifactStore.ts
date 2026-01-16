import { ArtifactStore } from "@/lib/storage/artifacts";
import { getPool } from "@/lib/db/pool";
import { MemoryArtifactStore } from "@/lib/storage/memoryArtifactStore";
import { PostgresArtifactStore } from "@/lib/storage/postgresArtifactStore";

export function getArtifactStore(): ArtifactStore {
  return getPool() ? new PostgresArtifactStore() : new MemoryArtifactStore();
}


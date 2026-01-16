import { getPool } from "@/lib/db/pool";
import { ArtifactRecord } from "@/lib/artifacts/types";
import { ArtifactStore, CreateArtifactInput } from "@/lib/storage/artifacts";

function rowToRecord(row: any): ArtifactRecord {
  return {
    id: String(row.id),
    type: row.type,
    address_id: row.address_id ?? null,
    city: row.city,
    input_params: row.input_params ?? {},
    output_data: row.output_data ?? {},
    pdf_url: row.pdf_url ?? null,
    web_slug: row.web_slug,
    created_at: new Date(row.created_at).toISOString(),
    user_email: row.user_email ?? null
  };
}

export class PostgresArtifactStore implements ArtifactStore {
  async create(input: CreateArtifactInput): Promise<ArtifactRecord> {
    const pool = getPool();
    if (!pool) throw new Error("DATABASE_URL not configured");

    const result = await pool.query(
      `
      INSERT INTO artifacts (type, address_id, city, input_params, output_data, pdf_url, web_slug, user_email)
      VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
      RETURNING *
      `,
      [
        input.type,
        input.address_id ?? null,
        input.city,
        JSON.stringify(input.input_params ?? {}),
        JSON.stringify(input.output_data ?? {}),
        input.pdf_url ?? null,
        input.web_slug,
        input.user_email ?? null
      ]
    );
    return rowToRecord(result.rows[0]);
  }

  async getById(id: string): Promise<ArtifactRecord | null> {
    const pool = getPool();
    if (!pool) return null;
    const result = await pool.query(`SELECT * FROM artifacts WHERE id = $1 LIMIT 1`, [id]);
    if (!result.rows[0]) return null;
    return rowToRecord(result.rows[0]);
  }

  async getBySlug(slug: string): Promise<ArtifactRecord | null> {
    const pool = getPool();
    if (!pool) return null;
    const result = await pool.query(`SELECT * FROM artifacts WHERE web_slug = $1 LIMIT 1`, [slug]);
    if (!result.rows[0]) return null;
    return rowToRecord(result.rows[0]);
  }
}

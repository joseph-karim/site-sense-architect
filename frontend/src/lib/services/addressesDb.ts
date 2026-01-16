import { getPool } from "@/lib/db/pool";

export type AddressInsert = {
  input_address: string;
  normalized_address: string;
  lat: number;
  lng: number;
  city: string;
};

export async function insertAddressIfConfigured(input: AddressInsert): Promise<string | null> {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(
    `
    INSERT INTO addresses (input_address, normalized_address, lat, lng, city)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id
    `,
    [input.input_address, input.normalized_address, input.lat, input.lng, input.city]
  );
  return String(result.rows[0]?.id ?? null);
}


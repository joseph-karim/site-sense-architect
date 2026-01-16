import pg from "pg";
import { env } from "@/lib/env";

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: pg.Pool | undefined;
}

/**
 * Builds a PostgreSQL connection string from environment variables.
 * Supports both full connection strings and individual components.
 */
function buildConnectionString(): string | null {
  // Prefer full connection strings
  if (env.SUPABASE_DATABASE_URL) return env.SUPABASE_DATABASE_URL;
  if (env.DATABASE_URL) return env.DATABASE_URL;

  // Build from individual components
  if (env.SUPABASE_DB_HOST && env.SUPABASE_DB_USER && env.SUPABASE_DB_PASSWORD) {
    const host = env.SUPABASE_DB_HOST;
    const port = env.SUPABASE_DB_PORT || "5432";
    const user = env.SUPABASE_DB_USER;
    const password = encodeURIComponent(env.SUPABASE_DB_PASSWORD);
    const database = env.SUPABASE_DB_NAME || "postgres";
    const sslMode = env.SUPABASE_DB_SSL || "require";

    return `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=${sslMode}`;
  }

  return null;
}

/**
 * Returns a singleton PostgreSQL connection pool for API routes.
 * Returns null if no database configuration is available.
 */
export function getPool(): pg.Pool | null {
  const connectionString = buildConnectionString();
  if (!connectionString) return null;

  if (!globalThis.__pgPool) {
    globalThis.__pgPool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5_000,
      query_timeout: 15_000,
      max: 5,
      idleTimeoutMillis: 30_000
    });
  }

  return globalThis.__pgPool;
}

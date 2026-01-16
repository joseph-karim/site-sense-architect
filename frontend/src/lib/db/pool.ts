import pg from "pg";
import { env } from "@/lib/env";

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: pg.Pool | undefined;
}

/**
 * Builds a PostgreSQL connection string from individual components
 */
function buildConnectionString(): string | null {
  // Option 1: Use full connection string if provided
  if (env.SUPABASE_DATABASE_URL) {
    return env.SUPABASE_DATABASE_URL;
  }
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

  // Option 2: Build from individual components
  if (env.SUPABASE_DB_HOST && env.SUPABASE_DB_USER && env.SUPABASE_DB_PASSWORD) {
    const host = env.SUPABASE_DB_HOST;
    const port = env.SUPABASE_DB_PORT || "5432";
    const user = env.SUPABASE_DB_USER;
    const password = encodeURIComponent(env.SUPABASE_DB_PASSWORD); // URL-encode password
    const database = env.SUPABASE_DB_NAME || "postgres";
    const sslMode = env.SUPABASE_DB_SSL || "require";

    return `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=${sslMode}`;
  }

  return null;
}

export function getPool(): pg.Pool | null {
  const connectionString = buildConnectionString();
  if (!connectionString) return null;
  
  if (!globalThis.__pgPool) {
    // pg library automatically handles SSL from connection string parameters
    // Most cloud providers include ?sslmode=require in their connection strings
    globalThis.__pgPool = new Pool({
      connectionString,
      // Prevent long hangs (e.g. CI/build or misconfigured networking)
      connectionTimeoutMillis: 5_000,
      query_timeout: 15_000,
      max: 5,
      idleTimeoutMillis: 30_000
    });
  }
  return globalThis.__pgPool;
}

import pg from "pg";
import { env } from "@/lib/env";

const { Pool } = pg;

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: pg.Pool | undefined;
}

export function getPool(): pg.Pool | null {
  // Prefer SUPABASE_DATABASE_URL if available, fallback to DATABASE_URL
  const connectionString = env.SUPABASE_DATABASE_URL || env.DATABASE_URL;
  if (!connectionString) return null;
  if (!globalThis.__pgPool) {
    // pg library automatically handles SSL from connection string parameters
    // Most cloud providers include ?sslmode=require in their connection strings
    globalThis.__pgPool = new Pool({ connectionString });
  }
  return globalThis.__pgPool;
}


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
  if (env.DATABASE_CONNECTION_STRING) {
    return env.DATABASE_CONNECTION_STRING;
  }
  if (env.DATABASE_URL) {
    return env.DATABASE_URL;
  }

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
  if (!connectionString) {
    return null;
  }

  if (!globalThis.__pgPool) {
    try {
      // Determine SSL configuration - always use rejectUnauthorized: false for cloud databases
      // This handles self-signed certificates from Supabase, Neon, Railway, etc.
      const sslModeMatch = connectionString.match(/[?&]sslmode=([^&]+)/);
      const sslMode = sslModeMatch ? sslModeMatch[1] : null;
      const isCloudDb = connectionString.includes('supabase') || connectionString.includes('neon') || connectionString.includes('railway') || connectionString.includes('render') || connectionString.includes('planetscale');
      // Always use SSL with rejectUnauthorized: false for any connection that requires SSL
      const needsSsl = sslMode === 'require' || sslMode === 'prefer' || isCloudDb || connectionString.includes('sslmode');
      
      let finalConnectionString = connectionString;
      
      // Remove sslmode from connection string if present, since we'll configure SSL separately
      // Use regex to avoid URL parsing which can double-encode special characters in passwords
      if (needsSsl && finalConnectionString.includes('sslmode')) {
        finalConnectionString = finalConnectionString
          .replace(/\?sslmode=[^&]+&?/, '?')  // sslmode at start of params
          .replace(/&sslmode=[^&]+/, '')       // sslmode in middle/end of params
          .replace(/\?$/, '');                 // cleanup trailing ?
      }

      const poolConfig: pg.PoolConfig = {
        connectionString: finalConnectionString,
        connectionTimeoutMillis: 5_000,
        query_timeout: 15_000,
        max: 5,
        idleTimeoutMillis: 30_000
      };

      // Always configure SSL for any connection that might need it
      if (needsSsl) {
        poolConfig.ssl = { rejectUnauthorized: false };
      }
      
      globalThis.__pgPool = new Pool(poolConfig);
    } catch (e: unknown) {
      console.error('Failed to create database pool:', e);
      throw e;
    }
  }

  return globalThis.__pgPool;
}

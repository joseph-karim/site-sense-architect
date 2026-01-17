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
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:15',message:'buildConnectionString entry',data:{hasSupabaseUrl:!!env.SUPABASE_DATABASE_URL,hasDatabaseUrl:!!env.DATABASE_URL,hasComponents:!!(env.SUPABASE_DB_HOST&&env.SUPABASE_DB_USER&&env.SUPABASE_DB_PASSWORD)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  // Prefer full connection strings
  if (env.SUPABASE_DATABASE_URL) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:19',message:'Using SUPABASE_DATABASE_URL',data:{urlLength:env.SUPABASE_DATABASE_URL.length,hasSslMode:env.SUPABASE_DATABASE_URL.includes('sslmode')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return env.SUPABASE_DATABASE_URL;
  }
  if (env.DATABASE_URL) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:24',message:'Using DATABASE_URL',data:{urlLength:env.DATABASE_URL.length,hasSslMode:env.DATABASE_URL.includes('sslmode')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
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
    const connStr = `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=${sslMode}`;
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:33',message:'Built connection string from components',data:{host,port,database,sslMode,connStrLength:connStr.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return connStr;
  }

  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:36',message:'No connection string available',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  return null;
}

/**
 * Returns a singleton PostgreSQL connection pool for API routes.
 * Returns null if no database configuration is available.
 */
export function getPool(): pg.Pool | null {
  // #region agent log
  fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:39',message:'getPool entry',data:{hasExistingPool:!!globalThis.__pgPool},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  const connectionString = buildConnectionString();
  if (!connectionString) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:43',message:'getPool returning null - no connection string',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    return null;
  }

  if (!globalThis.__pgPool) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:47',message:'Creating new Pool',data:{connStrHasSsl:connectionString.includes('sslmode'),connStrLength:connectionString.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      // Determine SSL configuration - always use rejectUnauthorized: false for cloud databases
      // This handles self-signed certificates from Supabase, Neon, Railway, etc.
      const sslModeMatch = connectionString.match(/[?&]sslmode=([^&]+)/);
      const sslMode = sslModeMatch ? sslModeMatch[1] : null;
      const isCloudDb = connectionString.includes('supabase') || connectionString.includes('neon') || connectionString.includes('railway') || connectionString.includes('render') || connectionString.includes('planetscale');
      // Always use SSL with rejectUnauthorized: false for any connection that requires SSL
      // This fixes "self-signed certificate in certificate chain" errors
      const needsSsl = sslMode === 'require' || sslMode === 'prefer' || isCloudDb || connectionString.includes('sslmode');
      
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:52',message:'SSL configuration check',data:{sslMode,isCloudDb,needsSsl,hasSslMode:connectionString.includes('sslmode')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      let finalConnectionString = connectionString;
      
      // Keep using direct connection - pooler has auth issues
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:88',message:'Using direct connection',data:{connectionStringLength:connectionString.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      
      // Remove sslmode from connection string if present, since we'll configure SSL separately
      // Use regex to avoid URL parsing which can double-encode special characters in passwords
      if (needsSsl && finalConnectionString.includes('sslmode')) {
        // Remove sslmode parameter using regex to avoid URL re-encoding
        finalConnectionString = finalConnectionString
          .replace(/\?sslmode=[^&]+&?/, '?')  // sslmode at start of params
          .replace(/&sslmode=[^&]+/, '')       // sslmode in middle/end of params
          .replace(/\?$/, '');                 // cleanup trailing ?
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:98',message:'Removed sslmode from connection string',data:{originalLength:connectionString.length,newLength:finalConnectionString.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
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
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:62',message:'Pool created successfully',data:{hasSslConfig:needsSsl,hasPool:!!globalThis.__pgPool},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    } catch (e: any) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/df048ba2-fede-4079-bdcd-da95fd010d48',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'pool.ts:65',message:'Pool creation error',data:{error:String(e?.message),errorCode:e?.code},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      throw e;
    }
  }

  return globalThis.__pgPool;
}

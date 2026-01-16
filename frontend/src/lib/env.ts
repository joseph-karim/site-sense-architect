import { z } from "zod";

const ServerEnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  // Supabase: Full connection string (preferred if available)
  SUPABASE_DATABASE_URL: z.string().optional(),
  // Supabase: Individual connection components (alternative to URL)
  SUPABASE_DB_HOST: z.string().optional(),
  SUPABASE_DB_PORT: z.string().optional(),
  SUPABASE_DB_USER: z.string().optional(),
  SUPABASE_DB_PASSWORD: z.string().optional(),
  SUPABASE_DB_NAME: z.string().optional(),
  SUPABASE_DB_SSL: z.string().optional(), // "require", "prefer", "disable", etc.
  // Supabase: API keys
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional(),
  MAPBOX_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  PORT: z.string().optional()
});

export const env = ServerEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  SUPABASE_DATABASE_URL: process.env.SUPABASE_DATABASE_URL,
  SUPABASE_DB_HOST: process.env.SUPABASE_DB_HOST,
  SUPABASE_DB_PORT: process.env.SUPABASE_DB_PORT,
  SUPABASE_DB_USER: process.env.SUPABASE_DB_USER,
  SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
  SUPABASE_DB_NAME: process.env.SUPABASE_DB_NAME,
  SUPABASE_DB_SSL: process.env.SUPABASE_DB_SSL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
  REDIS_URL: process.env.REDIS_URL,
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  PORT: process.env.PORT
});

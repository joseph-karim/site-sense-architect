import { z } from "zod";

const ServerEnvSchema = z.object({
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  MAPBOX_TOKEN: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  PORT: z.string().optional()
});

export const env = ServerEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  REDIS_URL: process.env.REDIS_URL,
  MAPBOX_TOKEN: process.env.MAPBOX_TOKEN,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  PORT: process.env.PORT
});

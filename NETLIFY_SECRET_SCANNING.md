# Netlify Secret Scanning - False Positives

## Issue

Netlify's secret scanner is flagging these environment variable **names** as potentially exposed secrets:

- `SUPABASE_DB_USER`
- `SUPABASE_DB_PORT`
- `SUPABASE_DB_SSL`

## Resolution

These are **NOT secrets** - they are environment variable **names** (configuration keys), not actual credential values. The actual secrets (passwords, API keys) are stored securely in Netlify's environment variables and are never committed to the repository.

## How to Fix in Netlify Dashboard

1. Go to your Netlify site dashboard
2. Navigate to **Site settings** → **Build & deploy** → **Environment**
3. Look for any secret scanning warnings/notifications
4. Mark these as **false positives** or **allowlist** them:
   - `SUPABASE_DB_USER` (this is a variable name, not a secret)
   - `SUPABASE_DB_PORT` (this is a variable name, not a secret)
   - `SUPABASE_DB_SSL` (this is a variable name, not a secret)

## Alternative: Rename Variables (Not Recommended)

If Netlify doesn't allow marking as false positives, you could rename these variables to less "suspicious" names, but this is not recommended as it would require code changes and is unnecessary since these are not actual secrets.

## What Are Actual Secrets?

The actual secrets that should NEVER be committed are:
- `SUPABASE_DB_PASSWORD` - The actual database password (stored in Netlify env vars)
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (stored in Netlify env vars)
- `SUPABASE_JWT_SECRET` - JWT secret (stored in Netlify env vars)
- `MAPBOX_TOKEN` - Mapbox API token (stored in Netlify env vars)

These are properly stored as environment variables in Netlify and are never in the codebase.

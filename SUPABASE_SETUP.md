# Supabase Setup Guide

This guide covers two methods to set up your Supabase database for the Part3 Entitlement Intelligence Platform.

## Method 1: Direct Database Connection (Recommended - Simpler)

### Step 1: Get Your Connection String

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/ugrbscrgztlqrptavsxp/settings/database
2. Scroll to "Connection string" section
3. For local setup: Select "URI" tab
4. For Netlify deployment: Select "Connection pooling" tab (recommended for serverless)
5. Copy the connection string
6. Replace `[YOUR-PASSWORD]` with your actual database password
   - Find your password in: Settings → Database → Database password

**Example connection strings:**
- Direct: `postgresql://postgres:your-password@db.ugrbscrgztlqrptavsxp.supabase.co:5432/postgres`
- Pooled (for Netlify): `postgresql://postgres.ugrbscrgztlqrptavsxp:your-password@aws-0-us-west-1.pooler.supabase.com:6543/postgres`

### Step 2: Run Setup Script

```bash
export SUPABASE_DATABASE_URL='your-connection-string-here'
./scripts/setup-supabase.sh
```

The script will:
- ✅ Test the database connection
- ✅ Install PostGIS extension (if not already installed)
- ✅ Run all database migrations
- ✅ Seed tripwires
- ✅ Import curated zoning rules

## Method 2: Supabase CLI (Alternative)

### Step 1: Install and Login

```bash
# Install Supabase CLI (if not already installed)
brew install supabase/tap/supabase

# Login to Supabase
supabase login
# This will open a browser to get your access token
```

### Step 2: Link Your Project

```bash
# Link to your project
supabase link --project-ref ugrbscrgztlqrptavsxp
```

### Step 3: Push Migrations

```bash
# Push migrations to Supabase
supabase db push

# Or run migrations manually
supabase db execute -f backend/db/migrations/001_init.sql
supabase db execute -f backend/db/migrations/002_zoning_districts_properties.sql
supabase db execute -f backend/db/migrations/003_part3_projects.sql
```

### Step 4: Import Data

```bash
# Get the connection string from Supabase CLI
supabase status

# Then use it with the import scripts
export SUPABASE_DATABASE_URL=$(supabase status | grep "DB URL" | awk '{print $3}')
cd frontend
node scripts/import-zoning-rules-json.mjs --file ../backend/data/curated-zoning-rules.json
```

## For Netlify Deployment

1. **Get Connection String:**
   - Use the "Connection pooling" string from Supabase dashboard
   - This is optimized for serverless functions

2. **Set in Netlify:**
   - Go to Site settings → Environment variables
   - Add: `DATABASE_URL` = your pooled connection string
   - Also add: `MAPBOX_TOKEN` and `NEXT_PUBLIC_APP_URL`

3. **Important:** Use the pooled connection string (port 6543) for Netlify, not the direct connection (port 5432)

## Troubleshooting

### Connection Errors

- **"password authentication failed"**: Check your database password
- **"connection refused"**: Ensure your IP is allowed (Supabase allows all by default)
- **"SSL required"**: Add `?sslmode=require` to your connection string

### PostGIS Not Found

If you get PostGIS errors:
```sql
-- Connect to your database and run:
CREATE EXTENSION IF NOT EXISTS postgis;
```

### Migration Errors

If migrations fail:
- Check that you're using the correct database (not the default `postgres` database if you created a custom one)
- Ensure you have superuser permissions (Supabase projects have this by default)

## Next Steps

After setup:
1. Import zoning districts (see `frontend/scripts/README.md`)
2. Import permits data (optional)
3. Set environment variables in Netlify
4. Deploy!

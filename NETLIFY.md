# Netlify Deployment Guide

## Prerequisites: Remote PostgreSQL Database

Netlify doesn't run Docker containers, so you need a remote PostgreSQL database. Here are free options:

### Option 1: Supabase (Recommended - Free Tier)
1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project
3. Go to Settings → Database
4. Copy the connection string (URI format)
5. Enable PostGIS extension: Go to SQL Editor and run:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   ```

### Option 2: Neon (Serverless PostgreSQL - Free Tier)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from the dashboard
4. PostGIS is pre-installed

### Option 3: Railway (Free Tier Available)
1. Sign up at [railway.app](https://railway.app)
2. Create a new PostgreSQL service
3. Copy the connection string
4. Enable PostGIS: Connect and run `CREATE EXTENSION IF NOT EXISTS postgis;`

### Option 4: Render (Free Tier Available)
1. Sign up at [render.com](https://render.com)
2. Create a new PostgreSQL database
3. Copy the connection string
4. Enable PostGIS via the database shell

## Database Setup Steps

1. **Create the database schema:**
   ```bash
   # Using your remote DATABASE_URL
   export DATABASE_URL="postgresql://user:password@host:5432/dbname"
   psql "$DATABASE_URL" -f backend/db/migrations/001_init.sql
   psql "$DATABASE_URL" -f backend/db/migrations/002_zoning_districts_properties.sql
   psql "$DATABASE_URL" -f backend/db/migrations/003_part3_projects.sql
   ```

2. **Seed tripwires (optional):**
   ```bash
   psql "$DATABASE_URL" -f backend/db/seeds/001_tripwires.sql
   ```

3. **Import your data:**
   ```bash
   cd frontend
   # Import zoning districts
   node scripts/import-zoning-geojson.mjs --city seattle --file ../backend/data/seattle/zoning/zoning.geojson --zone-code-field ZONING --zone-name-field ZONELUT_DE --source-url https://data.seattle.gov/dataset/Zoning --last-updated 2026-01-16
   
   # Import curated zoning rules
   node scripts/import-zoning-rules-json.mjs --file ../backend/data/curated-zoning-rules.json
   
   # Import permits (if you have the data)
   node scripts/import-permits-json.mjs --city seattle --file ../backend/data/seattle/permits/permits.json --permit-number-field permitnum --permit-type-field permittypemapped --status-field statuscurrent --address-field originaladdress1 --lat-field latitude --lng-field longitude
   ```

## Quick Setup

1. **Install the Netlify plugin** (if not already in package.json):
   ```bash
   cd frontend && npm install --save-dev @netlify/plugin-nextjs
   ```

2. **Set Environment Variables in Netlify Dashboard:**
   - Go to Site settings → Environment variables
   - Add the following:
     - `DATABASE_URL` - Your remote PostgreSQL connection string (e.g., `postgresql://user:password@host:5432/dbname`)
     - `MAPBOX_TOKEN` - Your Mapbox API token (for geocoding)
     - `NEXT_PUBLIC_APP_URL` - Your Netlify site URL (e.g., `https://your-site.netlify.app`)

3. **Build Settings in Netlify Dashboard:**
   - The `netlify.toml` file is already configured with:
     - Base directory: `frontend`
     - Build command: `npm install && npm run build`
     - Publish directory: `.next`
   - Netlify will auto-detect `netlify.toml` - no manual configuration needed!

4. **Deploy:**
   - Push to your connected Git branch
   - Netlify will auto-deploy

## Troubleshooting

### 404 Errors

If you're getting 404s:
1. Ensure `@netlify/plugin-nextjs` is installed: `cd frontend && npm install --save-dev @netlify/plugin-nextjs`
2. Check that `netlify.toml` is in the repository root
3. Verify build logs show the Next.js plugin is running
4. Check that environment variables are set correctly

### API Routes Not Working

- API routes require the `@netlify/plugin-nextjs` plugin
- Ensure `DATABASE_URL` is set in Netlify environment variables
- Check function logs in Netlify dashboard for errors

### Database Connection Issues

If you're getting database connection errors:

1. **SSL Connection Required**: Most cloud databases require SSL. Add `?sslmode=require` to your connection string:
   ```
   postgresql://user:password@host:5432/dbname?sslmode=require
   ```

2. **Connection Pooling**: For serverless functions, consider using a connection pooler:
   - **Supabase**: Use the "Connection pooling" connection string (port 6543)
   - **Neon**: Use the "Pooled connection" string
   - **Railway**: Connection pooling is built-in

3. **Test Connection Locally**: Before deploying, test your remote database:
   ```bash
   export DATABASE_URL="your-remote-connection-string"
   psql "$DATABASE_URL" -c "SELECT version();"
   ```

4. **Check Firewall/Network**: Ensure your database allows connections from Netlify's IP ranges (most cloud providers allow all by default, but check your settings)

### Build Failures

- Ensure Node.js version is 20 (set in `netlify.toml`)
- Check that all dependencies are in `package.json` (not just `package-lock.json`)
- Review build logs for specific errors

## Notes

- The `netlify.toml` file configures the build automatically
- API routes are handled as serverless functions by the plugin
- Dynamic routes (e.g., `/commercial-zoning/[city]`) work automatically with the plugin

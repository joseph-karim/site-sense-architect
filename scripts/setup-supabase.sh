#!/bin/bash
# Setup script for Supabase database
# Usage: SUPABASE_DATABASE_URL='your-connection-string' ./scripts/setup-supabase.sh

set -e

PROJECT_REF="ugrbscrgztlqrptavsxp"

echo "🚀 Setting up Supabase project: $PROJECT_REF"
echo ""

# Check for database URL
if [ -z "$SUPABASE_DATABASE_URL" ]; then
  echo "❌ SUPABASE_DATABASE_URL environment variable is not set"
  echo ""
  echo "Get your connection string from Supabase dashboard:"
  echo "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
  echo "2. Under 'Connection string', select 'URI'"
  echo "3. Copy the connection string (replace [YOUR-PASSWORD] with your database password)"
  echo ""
  echo "For direct connection (port 5432):"
  echo "  postgresql://postgres:[YOUR-PASSWORD]@db.$PROJECT_REF.supabase.co:5432/postgres"
  echo ""
  echo "For connection pooling (recommended for Netlify/serverless, port 6543):"
  echo "  postgresql://postgres.$PROJECT_REF:[YOUR-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:6543/postgres"
  echo ""
  echo "Then run:"
  echo "  export SUPABASE_DATABASE_URL='your-connection-string'"
  echo "  ./scripts/setup-supabase.sh"
  exit 1
fi

echo "🔍 Testing database connection..."
if ! psql "$SUPABASE_DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
  echo "❌ Error: Cannot connect to database"
  echo "Check your SUPABASE_DATABASE_URL and ensure:"
  echo "  - Password is correct"
  echo "  - Connection string includes ?sslmode=require (if needed)"
  echo "  - Database is accessible from your IP"
  exit 1
fi

echo "✅ Database connection successful!"
echo ""

# Check if PostGIS is installed
echo "🔍 Checking PostGIS extension..."
if psql "$SUPABASE_DATABASE_URL" -c "SELECT PostGIS_version();" > /dev/null 2>&1; then
  echo "✅ PostGIS is installed"
else
  echo "📦 Installing PostGIS extension..."
  psql "$SUPABASE_DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;"
  echo "✅ PostGIS installed"
fi

echo ""
echo "📦 Creating database schema..."

echo "  → Running migration 001_init.sql..."
psql "$SUPABASE_DATABASE_URL" -f backend/db/migrations/001_init.sql
echo "  ✅ Schema created"

echo "  → Running migration 002_zoning_districts_properties.sql..."
psql "$SUPABASE_DATABASE_URL" -f backend/db/migrations/002_zoning_districts_properties.sql 2>/dev/null || echo "  ⚠️  Column may already exist (this is OK)"

echo "  → Running migration 003_part3_projects.sql..."
psql "$SUPABASE_DATABASE_URL" -f backend/db/migrations/003_part3_projects.sql 2>/dev/null || echo "  ⚠️  Table may already exist (this is OK)"

echo ""
echo "📦 Seeding tripwires..."
if [ -f "backend/db/seeds/001_tripwires.sql" ]; then
  psql "$SUPABASE_DATABASE_URL" -f backend/db/seeds/001_tripwires.sql
  echo "  ✅ Tripwires seeded"
else
  echo "  ⚠️  Tripwires seed file not found (optional)"
fi

echo ""
echo "📦 Importing curated zoning rules..."
if [ -f "backend/data/curated-zoning-rules.json" ]; then
  cd frontend
  node scripts/import-zoning-rules-json.mjs --file ../backend/data/curated-zoning-rules.json
  cd ..
  echo "  ✅ Zoning rules imported"
else
  echo "  ⚠️  Curated zoning rules file not found"
fi

echo ""
echo "✅ Supabase database setup complete!"
echo ""
echo "Next steps:"
echo "1. Import zoning districts (optional):"
echo "   cd frontend && node scripts/import-zoning-geojson.mjs --city seattle --file ../backend/data/seattle/zoning/zoning.geojson ..."
echo ""
echo "2. Set SUPABASE_DATABASE_URL in Netlify environment variables"
echo "   (Use the connection pooling string for better performance)"
echo ""
echo "3. Also set in Netlify:"
echo "   - MAPBOX_TOKEN"
echo "   - NEXT_PUBLIC_APP_URL"

#!/bin/bash
# Setup script for Supabase database
# Usage: ./scripts/setup-supabase.sh
# 
# This script will:
# 1. Load environment variables from .env files (if present)
# 2. Use SUPABASE_DATABASE_URL or DATABASE_URL
# 3. Set up the database schema and import data

set -e

PROJECT_REF="ugrbscrgztlqrptavsxp"

echo "🚀 Setting up Supabase project: $PROJECT_REF"
echo ""

# Load environment variables from .env files if they exist
# Check in order: backend/db/.env, .env, frontend/.env.local, frontend/.env
if [ -f "backend/db/.env" ]; then
  echo "📄 Loading backend/db/.env..."
  set -a
  source backend/db/.env
  set +a
fi

if [ -f ".env" ]; then
  echo "📄 Loading .env file from project root..."
  set -a
  source .env
  set +a
fi

if [ -f "frontend/.env.local" ]; then
  echo "📄 Loading frontend/.env.local..."
  set -a
  source frontend/.env.local
  set +a
fi

if [ -f "frontend/.env" ]; then
  echo "📄 Loading frontend/.env..."
  set -a
  source frontend/.env
  set +a
fi

# Determine which database URL to use
# Priority: 1) SUPABASE_DATABASE_URL, 2) DATABASE_URL, 3) Build from components

if [ -n "$SUPABASE_DATABASE_URL" ] && [[ "$SUPABASE_DATABASE_URL" == postgresql://* || "$SUPABASE_DATABASE_URL" == postgres://* ]]; then
  DATABASE_URL="$SUPABASE_DATABASE_URL"
  echo "✅ Using SUPABASE_DATABASE_URL (full connection string)"
elif [ -n "$DATABASE_URL" ]; then
  echo "✅ Using DATABASE_URL"
  DATABASE_URL="$DATABASE_URL"
elif [ -n "$SUPABASE_DB_HOST" ] && [ -n "$SUPABASE_DB_USER" ] && [ -n "$SUPABASE_DB_PASSWORD" ]; then
  # Build connection string from individual components
  HOST="${SUPABASE_DB_HOST}"
  PORT="${SUPABASE_DB_PORT:-5432}"
  USER="${SUPABASE_DB_USER}"
  PASSWORD="${SUPABASE_DB_PASSWORD}"
  DB_NAME="${SUPABASE_DB_NAME:-postgres}"
  SSL_MODE="${SUPABASE_DB_SSL:-require}"
  
  # URL-encode password (handle special characters)
  ENCODED_PASSWORD=$(printf '%s' "$PASSWORD" | jq -sRr @uri 2>/dev/null || echo "$PASSWORD" | sed 's/%/%25/g; s/?/%3F/g; s/@/%40/g; s/#/%23/g')
  
  DATABASE_URL="postgresql://${USER}:${ENCODED_PASSWORD}@${HOST}:${PORT}/${DB_NAME}?sslmode=${SSL_MODE}"
  echo "✅ Built connection string from individual components"
  echo "   Host: $HOST"
  echo "   Port: $PORT"
  echo "   User: $USER"
  echo "   Database: $DB_NAME"
else
  DATABASE_URL=""
fi

# Check for database URL
if [ -z "$DATABASE_URL" ]; then
  echo "❌ No database connection configuration found"
  echo ""
  echo "Add one of these options to backend/db/.env or .env:"
  echo ""
  echo "Option 1: Full connection string (recommended)"
  echo "  SUPABASE_DATABASE_URL='postgresql://postgres:password@db.$PROJECT_REF.supabase.co:5432/postgres'"
  echo ""
  echo "Option 2: Individual components (more flexible, better for secrets management)"
  echo "  SUPABASE_DB_HOST='db.$PROJECT_REF.supabase.co'"
  echo "  SUPABASE_DB_PORT='5432'"
  echo "  SUPABASE_DB_USER='postgres'"
  echo "  SUPABASE_DB_PASSWORD='your-password'"
  echo "  SUPABASE_DB_NAME='postgres'"
  echo "  SUPABASE_DB_SSL='require'"
  echo ""
  echo "Option 3: Generic DATABASE_URL"
  echo "  DATABASE_URL='postgresql://postgres:password@db.$PROJECT_REF.supabase.co:5432/postgres'"
  echo ""
  echo "Get connection details from Supabase dashboard:"
  echo "  https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
  echo ""
  echo "For connection pooling (recommended for Netlify/serverless):"
  echo "  Use the 'Connection pooling' string (port 6543)"
  exit 1
fi

echo "🔍 Testing database connection..."
if ! psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
  echo "❌ Error: Cannot connect to database"
  echo "Check your DATABASE_URL/SUPABASE_DATABASE_URL and ensure:"
  echo "  - Password is correct"
  echo "  - Connection string includes ?sslmode=require (if needed)"
  echo "  - Database is accessible from your IP"
  exit 1
fi

echo "✅ Database connection successful!"
echo ""

# Check if PostGIS is installed
echo "🔍 Checking PostGIS extension..."
if psql "$DATABASE_URL" -c "SELECT PostGIS_version();" > /dev/null 2>&1; then
  echo "✅ PostGIS is installed"
else
  echo "📦 Installing PostGIS extension..."
  psql "$DATABASE_URL" -c "CREATE EXTENSION IF NOT EXISTS postgis;"
  echo "✅ PostGIS installed"
fi

echo ""
echo "📦 Creating database schema..."

echo "  → Running migration 001_init.sql..."
psql "$DATABASE_URL" -f backend/db/migrations/001_init.sql
echo "  ✅ Schema created"

echo "  → Running migration 002_zoning_districts_properties.sql..."
psql "$DATABASE_URL" -f backend/db/migrations/002_zoning_districts_properties.sql 2>/dev/null || echo "  ⚠️  Column may already exist (this is OK)"

echo "  → Running migration 003_part3_projects.sql..."
psql "$DATABASE_URL" -f backend/db/migrations/003_part3_projects.sql 2>/dev/null || echo "  ⚠️  Table may already exist (this is OK)"

echo ""
echo "📦 Seeding tripwires..."
if [ -f "backend/db/seeds/001_tripwires.sql" ]; then
  psql "$DATABASE_URL" -f backend/db/seeds/001_tripwires.sql
  echo "  ✅ Tripwires seeded"
else
  echo "  ⚠️  Tripwires seed file not found (optional)"
fi

echo ""
echo "📦 Importing curated zoning rules..."
if [ -f "backend/data/curated-zoning-rules.json" ]; then
  cd frontend
  # Pass DATABASE_URL to the import script
  DATABASE_URL="$DATABASE_URL" node scripts/import-zoning-rules-json.mjs --file ../backend/data/curated-zoning-rules.json
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
echo "   cd frontend"
echo "   DATABASE_URL='$DATABASE_URL' node scripts/import-zoning-geojson.mjs --city seattle --file ../backend/data/seattle/zoning/zoning.geojson ..."
echo ""
echo "2. Set DATABASE_URL or SUPABASE_DATABASE_URL in Netlify environment variables"
echo "   (Use the connection pooling string for better performance)"
echo ""
echo "3. Also set in Netlify:"
echo "   - MAPBOX_TOKEN"
echo "   - NEXT_PUBLIC_APP_URL"

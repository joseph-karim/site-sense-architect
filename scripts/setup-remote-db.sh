#!/bin/bash
# Quick setup script for remote PostgreSQL database (Supabase, Neon, etc.)
# Usage: ./scripts/setup-remote-db.sh

set -e

if [ -z "$DATABASE_URL" ]; then
  echo "❌ Error: DATABASE_URL environment variable is not set"
  echo ""
  echo "Set it like this:"
  echo "  export DATABASE_URL='postgresql://user:password@host:5432/dbname?sslmode=require'"
  echo ""
  echo "Or for Supabase/Neon with connection pooling:"
  echo "  export DATABASE_URL='postgresql://user:password@host:6543/dbname?sslmode=require'"
  exit 1
fi

echo "🔍 Testing database connection..."
if ! psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
  echo "❌ Error: Cannot connect to database. Check your DATABASE_URL"
  exit 1
fi

echo "✅ Database connection successful!"
echo ""

echo "📦 Creating database schema..."
psql "$DATABASE_URL" -f backend/db/migrations/001_init.sql
echo "✅ Schema created"

echo "📦 Adding zoning_districts properties column..."
psql "$DATABASE_URL" -f backend/db/migrations/002_zoning_districts_properties.sql 2>/dev/null || echo "⚠️  Column may already exist (this is OK)"

echo "📦 Adding part3_projects table..."
psql "$DATABASE_URL" -f backend/db/migrations/003_part3_projects.sql 2>/dev/null || echo "⚠️  Table may already exist (this is OK)"

echo "📦 Seeding tripwires..."
if [ -f "backend/db/seeds/001_tripwires.sql" ]; then
  psql "$DATABASE_URL" -f backend/db/seeds/001_tripwires.sql
  echo "✅ Tripwires seeded"
else
  echo "⚠️  Tripwires seed file not found (optional)"
fi

echo ""
echo "✅ Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Import zoning districts (see frontend/scripts/README.md)"
echo "2. Import curated zoning rules:"
echo "   cd frontend && node scripts/import-zoning-rules-json.mjs --file ../backend/data/curated-zoning-rules.json"
echo "3. Import permits (optional):"
echo "   cd frontend && node scripts/import-permits-json.mjs --city seattle --file ../backend/data/seattle/permits/permits.json ..."
echo ""
echo "Then set DATABASE_URL in your Netlify environment variables!"

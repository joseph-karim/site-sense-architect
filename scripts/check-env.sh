#!/bin/bash
# Quick script to check if database connection is configured correctly

echo "🔍 Checking environment configuration..."
echo ""

# Load .env files
if [ -f "backend/db/.env" ]; then
  set -a
  source backend/db/.env
  set +a
  echo "✅ Loaded backend/db/.env"
fi

if [ -f ".env" ]; then
  set -a
  source .env
  set +a
  echo "✅ Loaded .env"
fi

if [ -f "frontend/.env.local" ]; then
  set -a
  source frontend/.env.local
  set +a
  echo "✅ Loaded frontend/.env.local"
fi

echo ""
echo "Database connection variables:"

if [ -n "$SUPABASE_DATABASE_URL" ]; then
  echo "  ✅ SUPABASE_DATABASE_URL is set"
  echo "     Format: ${SUPABASE_DATABASE_URL:0:60}..."
  if [[ "$SUPABASE_DATABASE_URL" == postgresql://* ]] || [[ "$SUPABASE_DATABASE_URL" == postgres://* ]]; then
    echo "     ✅ Valid PostgreSQL connection string format"
  else
    echo "     ❌ Invalid format - should start with postgresql:// or postgres://"
    echo "        This looks like an API URL, not a database connection string"
  fi
else
  echo "  ⚠️  SUPABASE_DATABASE_URL not set"
fi

if [ -n "$DATABASE_URL" ]; then
  echo "  ✅ DATABASE_URL is set"
  echo "     Format: ${DATABASE_URL:0:60}..."
  if [[ "$DATABASE_URL" == postgresql://* ]] || [[ "$DATABASE_URL" == postgres://* ]]; then
    echo "     ✅ Valid PostgreSQL connection string format"
  else
    echo "     ❌ Invalid format - should start with postgresql:// or postgres://"
    echo "        This looks like an API URL, not a database connection string"
  fi
else
  echo "  ⚠️  DATABASE_URL not set"
fi

echo ""
DATABASE_URL="${SUPABASE_DATABASE_URL:-$DATABASE_URL}"

if [ -z "$DATABASE_URL" ]; then
  echo "❌ No database connection string found"
  echo ""
  echo "Add to backend/db/.env:"
  echo "  SUPABASE_DATABASE_URL='postgresql://postgres:password@db.ugrbscrgztlqrptavsxp.supabase.co:5432/postgres'"
  exit 1
fi

if [[ "$DATABASE_URL" != postgresql://* ]] && [[ "$DATABASE_URL" != postgres://* ]]; then
  echo "❌ Invalid connection string format"
  echo ""
  echo "The connection string should be a PostgreSQL URI, not an API URL."
  echo ""
  echo "Get the correct connection string from:"
  echo "  https://supabase.com/dashboard/project/ugrbscrgztlqrptavsxp/settings/database"
  echo ""
  echo "Select 'URI' tab for direct connection, or 'Connection pooling' for serverless"
  exit 1
fi

echo "🔍 Testing connection..."
if psql "$DATABASE_URL" -c "SELECT version();" > /dev/null 2>&1; then
  echo "✅ Database connection successful!"
  psql "$DATABASE_URL" -c "SELECT version();" | head -1
else
  echo "❌ Database connection failed"
  echo "Check your credentials and connection string"
  exit 1
fi

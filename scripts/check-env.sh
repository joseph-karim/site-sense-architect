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

# Check for full connection string
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

# Check for individual components
COMPONENTS_COUNT=0
if [ -n "$SUPABASE_DB_HOST" ]; then ((COMPONENTS_COUNT++)); fi
if [ -n "$SUPABASE_DB_USER" ]; then ((COMPONENTS_COUNT++)); fi
if [ -n "$SUPABASE_DB_PASSWORD" ]; then ((COMPONENTS_COUNT++)); fi

if [ $COMPONENTS_COUNT -gt 0 ]; then
  echo "  ✅ Individual connection components found:"
  [ -n "$SUPABASE_DB_HOST" ] && echo "     ✅ SUPABASE_DB_HOST=$SUPABASE_DB_HOST"
  [ -n "$SUPABASE_DB_PORT" ] && echo "     ✅ SUPABASE_DB_PORT=$SUPABASE_DB_PORT" || echo "     ⚠️  SUPABASE_DB_PORT not set (will default to 5432)"
  [ -n "$SUPABASE_DB_USER" ] && echo "     ✅ SUPABASE_DB_USER=$SUPABASE_DB_USER"
  [ -n "$SUPABASE_DB_PASSWORD" ] && echo "     ✅ SUPABASE_DB_PASSWORD=***hidden***"
  [ -n "$SUPABASE_DB_NAME" ] && echo "     ✅ SUPABASE_DB_NAME=$SUPABASE_DB_NAME" || echo "     ⚠️  SUPABASE_DB_NAME not set (will default to postgres)"
  [ -n "$SUPABASE_DB_SSL" ] && echo "     ✅ SUPABASE_DB_SSL=$SUPABASE_DB_SSL" || echo "     ⚠️  SUPABASE_DB_SSL not set (will default to require)"
  
  if [ $COMPONENTS_COUNT -lt 3 ]; then
    echo "     ❌ Missing required components (need: HOST, USER, PASSWORD)"
  fi
else
  echo "  ⚠️  Individual connection components not set"
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
# Build connection string from available sources
if [ -n "$SUPABASE_DATABASE_URL" ] && [[ "$SUPABASE_DATABASE_URL" == postgresql://* || "$SUPABASE_DATABASE_URL" == postgres://* ]]; then
  DATABASE_URL="$SUPABASE_DATABASE_URL"
elif [ -n "$SUPABASE_DB_HOST" ] && [ -n "$SUPABASE_DB_USER" ] && [ -n "$SUPABASE_DB_PASSWORD" ]; then
  # Build from components
  HOST="${SUPABASE_DB_HOST}"
  PORT="${SUPABASE_DB_PORT:-5432}"
  USER="${SUPABASE_DB_USER}"
  PASSWORD="${SUPABASE_DB_PASSWORD}"
  DB_NAME="${SUPABASE_DB_NAME:-postgres}"
  SSL_MODE="${SUPABASE_DB_SSL:-require}"
  ENCODED_PASSWORD=$(printf '%s' "$PASSWORD" | jq -sRr @uri 2>/dev/null || echo "$PASSWORD" | sed 's/%/%25/g; s/?/%3F/g; s/@/%40/g; s/#/%23/g')
  DATABASE_URL="postgresql://${USER}:${ENCODED_PASSWORD}@${HOST}:${PORT}/${DB_NAME}?sslmode=${SSL_MODE}"
  echo "  📦 Built connection string from components"
elif [ -n "$DATABASE_URL" ]; then
  DATABASE_URL="$DATABASE_URL"
else
  DATABASE_URL=""
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ No database connection configuration found"
  echo ""
  echo "Add one of these to backend/db/.env:"
  echo ""
  echo "Option 1: Full connection string"
  echo "  SUPABASE_DATABASE_URL='postgresql://postgres:password@db.ugrbscrgztlqrptavsxp.supabase.co:5432/postgres'"
  echo ""
  echo "Option 2: Individual components"
  echo "  SUPABASE_DB_HOST='db.ugrbscrgztlqrptavsxp.supabase.co'"
  echo "  SUPABASE_DB_PORT='5432'"
  echo "  SUPABASE_DB_USER='postgres'"
  echo "  SUPABASE_DB_PASSWORD='your-password'"
  echo "  SUPABASE_DB_NAME='postgres'"
  echo "  SUPABASE_DB_SSL='require'"
  exit 1
fi

if [[ "$DATABASE_URL" != postgresql://* ]] && [[ "$DATABASE_URL" != postgres://* ]]; then
  echo "❌ Invalid connection string format"
  echo ""
  echo "The connection string should be a PostgreSQL URI, not an API URL."
  echo ""
  echo "Get the correct connection string from:"
  echo "  https://supabase.com/dashboard/project/ugrbscrgztlqrptavsxp/settings/database"
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

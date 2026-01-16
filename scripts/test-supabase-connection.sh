#!/bin/bash
# Test Supabase database connection with different methods

set -e

echo "🔍 Testing Supabase Database Connection"
echo "========================================"
echo ""

# Load .env
if [ -f "backend/db/.env" ]; then
  set -a
  source backend/db/.env
  set +a
fi

PASSWORD="Rm?L_rHi5vepZ%B"
PROJECT_REF="ugrbscrgztlqrptavsxp"

echo "Testing different connection methods..."
echo ""

# Method 1: Direct connection with URL-encoded password
echo "1️⃣  Testing direct connection (port 5432) with URL-encoded password..."
CONN1="postgresql://postgres:Rm%3FL_rHi5vepZ%25B@db.$PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
if psql "$CONN1" -c "SELECT version();" > /dev/null 2>&1; then
  echo "   ✅ SUCCESS with direct connection"
  echo "   Connection string: $CONN1"
  exit 0
else
  echo "   ❌ Failed"
fi

# Method 2: Using PGPASSWORD with direct connection
echo ""
echo "2️⃣  Testing with PGPASSWORD environment variable..."
export PGPASSWORD="$PASSWORD"
export PGHOST="db.$PROJECT_REF.supabase.co"
export PGPORT="5432"
export PGUSER="postgres"
export PGDATABASE="postgres"
export PGSSLMODE="require"

if psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT version();" > /dev/null 2>&1; then
  echo "   ✅ SUCCESS with PGPASSWORD"
  echo "   Use: export PGPASSWORD='$PASSWORD'"
  echo "        psql -h db.$PROJECT_REF.supabase.co -p 5432 -U postgres -d postgres"
  exit 0
else
  echo "   ❌ Failed: $(psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "SELECT 1;" 2>&1 | head -1)"
fi

# Method 3: Connection pooling
echo ""
echo "3️⃣  Testing connection pooling (port 6543)..."
# Try different pooling formats
POOL_CONN1="postgresql://postgres.$PROJECT_REF:Rm%3FL_rHi5vepZ%25B@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
if psql "$POOL_CONN1" -c "SELECT version();" > /dev/null 2>&1; then
  echo "   ✅ SUCCESS with connection pooling"
  echo "   Connection string: $POOL_CONN1"
  exit 0
else
  echo "   ❌ Failed"
fi

echo ""
echo "❌ All connection methods failed"
echo ""
echo "Troubleshooting:"
echo "1. Verify the password is correct in Supabase dashboard"
echo "2. Check if direct connections are enabled:"
echo "   https://supabase.com/dashboard/project/$PROJECT_REF/settings/database"
echo "   → Look for 'Connection pooling' or 'Direct connections' settings"
echo ""
echo "3. Try getting a fresh connection string from Supabase dashboard:"
echo "   Settings → Database → Connection string → URI"
echo ""
echo "4. Make sure your IP is allowed (Supabase allows all by default)"

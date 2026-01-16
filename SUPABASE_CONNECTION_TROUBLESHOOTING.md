# Supabase Connection Troubleshooting

## Getting the Correct Connection String

**Important**: Get your connection string directly from the Supabase dashboard to ensure it's correct.

1. Go to: https://supabase.com/dashboard/project/ugrbscrgztlqrptavsxp/settings/database
2. Click the **"Connect"** button at the top
3. Choose the appropriate connection method:

### For Netlify/Serverless (Recommended)
- Select **"Connection pooling"** tab
- Choose **"Transaction mode"** (port 6543)
- Copy the connection string
- This is optimized for serverless functions

### For Persistent Backends
- Select **"Connection pooling"** tab  
- Choose **"Session mode"** (port 5432)
- Copy the connection string

### For Direct Connection (requires IPv6)
- Select **"URI"** tab
- Copy the connection string
- Only works if your network supports IPv6

## Current Issue: Authentication Failed

The connection string format appears correct, but authentication is failing.

## Quick Fixes

### Option 1: Enable Direct Connections in Supabase

1. Go to: https://supabase.com/dashboard/project/ugrbscrgztlqrptavsxp/settings/database
2. Scroll to "Connection pooling" section
3. Ensure "Direct connections" are enabled
4. Or use "Connection pooling" (recommended for serverless)

### Option 2: Use Connection Pooling String

1. In Supabase dashboard → Settings → Database
2. Under "Connection string", select **"Connection pooling"** tab
3. Copy the connection string (it will use port 6543)
4. Update `backend/db/.env`:
   ```bash
   SUPABASE_DATABASE_URL="postgresql://postgres.ugrbscrgztlqrptavsxp:password@aws-0-us-west-1.pooler.supabase.com:6543/postgres?sslmode=require"
   ```
5. **Important**: URL-encode special characters in password:
   - `?` → `%3F`
   - `%` → `%25`

### Option 3: Verify Password

1. Go to: https://supabase.com/dashboard/project/ugrbscrgztlqrptavsxp/settings/database
2. Click "Reset database password" if needed
3. Copy the new password
4. Update connection string with URL-encoded password

## Test Connection

Run the test script:
```bash
./scripts/test-supabase-connection.sh
```

Or test manually:
```bash
# Load environment
source backend/db/.env

# Test connection
psql "$SUPABASE_DATABASE_URL" -c "SELECT version();"
```

## Once Connection Works

Run migrations:
```bash
./scripts/setup-supabase.sh
```

Import data:
```bash
cd frontend
node scripts/import-zoning-rules-json.mjs --file ../backend/data/curated-zoning-rules.json
```

## For Netlify Deployment

Use the **Connection pooling** string (port 6543) - it's optimized for serverless functions and handles connection limits better.

Set in Netlify:
- `DATABASE_URL` = your connection pooling string
- Or `SUPABASE_DATABASE_URL` = your connection pooling string

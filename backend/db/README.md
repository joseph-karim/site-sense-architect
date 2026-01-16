# Database

Apply the migrations in `backend/db/migrations/` to a Postgres 16 + PostGIS database.

Local dev (from repo root):

- Start services: `docker compose up -d`
- Apply migrations:
  - `psql "$DATABASE_URL" -f backend/db/migrations/001_init.sql`
  - `psql "$DATABASE_URL" -f backend/db/migrations/002_zoning_districts_properties.sql`

Environment example: `backend/.env.example`

Optional:

- Seed tripwires: `psql "$DATABASE_URL" -f backend/db/seeds/001_tripwires.sql`

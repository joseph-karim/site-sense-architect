# Seeds

Optional seed data to make the MVP usable before you’ve implemented the city sync pipelines.

Apply seeds (after migrations):

- `psql "$DATABASE_URL" -f backend/db/seeds/001_tripwires.sql`


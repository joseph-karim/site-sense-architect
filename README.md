# Part3 Entitlement Intelligence Platform

Product-led SEO platform that turns zoning + permitting + code “unknowns” into real artifacts (web view + PDF).

## Scope (commercial-only)

This repository intentionally focuses on **commercial and institutional** projects (not residential-only work).

Canonical `use_type` values:
- `office`
- `retail`
- `mixed-use`
- `healthcare`
- `education`
- `civic`

## What’s in this repo

- `frontend/`: Next.js 14 (App Router) web + API routes
- `backend/db/`: Postgres 16 + PostGIS schema migrations + seed SQL
- `docker-compose.yml`: local PostGIS + Redis

## Quickstart (local)

1) Start PostGIS + Redis:

`docker compose up -d`

2) Set env vars:

- Copy `backend/.env.example` → your shell env (or `.env` in your preferred loader)
- Copy `frontend/.env.example` → `frontend/.env.local`

If you run Next.js on a non-default port (e.g. `3002`), set `NEXT_PUBLIC_APP_URL` accordingly so `sitemap.xml` uses the right host.

3) Create tables:

`psql "$DATABASE_URL" -f backend/db/migrations/001_init.sql`

4) Optional: seed MVP tripwires:

`psql "$DATABASE_URL" -f backend/db/seeds/001_tripwires.sql`

5) Import city datasets (local files):

- Zoning (GeoJSON): see `frontend/scripts/README.md`
- Permits (JSON export): see `frontend/scripts/README.md`

Tip: run imports from `frontend/`:

`cd frontend && npm run import:zoning -- --city seattle --file ../backend/data/seattle/zoning/zoning.geojson --zone-code-field ZONING --zone-name-field ZONELUT_DE --source-url https://data.seattle.gov/dataset/Zoning --last-updated 2026-01-16`

6) After importing permits, compute timeline percentiles:

`curl -X POST http://localhost:3000/api/admin/calculate-permit-stats/seattle`

7) Run the web app:

`cd frontend && npm install && npm run dev`

Open `http://localhost:3000` (or your chosen port).

Notes:
- `backend/data/` is `.gitignore`’d so you can keep large downloads locally without committing them.
- Once `zoning_districts` is imported, `/api/zoning/lookup` uses PostGIS spatial queries instead of mocks.
- `docker-compose.yml` maps Redis to `localhost:6380` to avoid common `6379` conflicts.

## API endpoints (spec-aligned)

Public:
- `GET /api/zoning/lookup?address=&city=&use_type=`
- `GET /api/permits/pathway?city=&project_type=`
- `GET /api/code/tripwires?city=&occupancy_type=`
- `GET /api/artifact/:id`
- `GET /api/artifact/:id/pdf`

Protected (email capture):
- `POST /api/artifact/kickoff-pack`
- `POST /api/risk-register/track`

Admin:
- `POST /api/admin/sync-zoning/:city` (stub)
- `POST /api/admin/sync-permits/:city` (stub)
- `POST /api/admin/calculate-permit-stats/:city` (minimal implementation)

## SEO routes

- `/commercial-zoning/[city]`
- `/commercial-zoning/[city]/[zoneCode]` (SSG for a curated/top set)
- `/commercial-permits/[city]`
- `/commercial-snapshots/[city]/[useType]` (generalized, non-address previews)
- `/tools/commercial-zoning-snapshot`
- `/tools/commercial-permit-pathway`
- `/tools/commercial-risk-register`
- `/tools/[toolSlug]`
- `/report/[artifactSlug]`

Legacy routes (`/zoning/*`, `/permits/*`, `/zoning/*/use/*`) redirect into the canonical commercial routes and are intentionally excluded from the sitemap to avoid duplicate indexing.

### Note on SSG vs DB connectivity (Netlify-safe)

Netlify build workers should not depend on direct Postgres connectivity for SSG pages (timeouts/ACLs are common).
To keep commercial zoning pages statically generated, the build uses a small, build-safe zoning index:

- `frontend/src/lib/seo/zoningIndex.ts`

Populate that file with a larger list of `(zone_code, zone_name)` (exported from your DB) to increase the number of SSG zone pages. The code currently pre-renders the “top 40” zones per city.

## Implementation notes

- The “artifact creation” integration point is `frontend/src/lib/services/artifactService.ts`.
- When `DATABASE_URL` is set, `/api/zoning/lookup`, `/api/code/tripwires`, and `/api/permits/pathway` will query Postgres if the relevant tables are populated, and fall back to mocks otherwise.
- PDF output is a lightweight placeholder renderer (`frontend/src/lib/pdf/simplePdf.ts`) so downloads work end-to-end.

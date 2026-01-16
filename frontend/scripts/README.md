# Data import scripts (local)

These scripts assume you already started PostGIS (`docker compose up -d`) and applied migrations.

They read local files (no network access required) and load data into Postgres for the API routes to query.

## Environment Variables

Set `DATABASE_URL` before running any script:

```bash
export DATABASE_URL="postgres://USER:PASSWORD@localhost:5432/part3"
# For local docker-compose: postgres://part3:part3@localhost:5432/part3
```

## Import zoning districts (GeoJSON)

Example (Seattle):

`node scripts/import-zoning-geojson.mjs --city seattle --file ../backend/data/seattle/zoning/zoning.geojson --zone-code-field ZONING --zone-name-field ZONELUT_DE --props-fields HISTORIC,OVERLAY,SHORELINE,PEDESTRIAN,VILLAGE,MIO,LIGHTRAIL --source-url https://data.seattle.gov/dataset/Zoning --last-updated 2026-01-16`

Example (Chicago "rows with geometry" format):

`node scripts/import-zoning-geojson.mjs --city chicago --file ../backend/data/chicago/zoning/zoning.json --geometry-field the_geom --zone-code-field zone_class --zone-name-field zone_type --props-fields pd_num,zone_type --source-url https://data.cityofchicago.org/dataset/Zoning-Districts --last-updated 2026-01-16`

Austin note:
- If you download Austin zoning as a Shapefile, convert to GeoJSON first (e.g. `ogr2ogr -f GeoJSON austin.geojson zoning.shp`) and then run `import-zoning-geojson.mjs` with the correct `--zone-code-field` / `--zone-name-field` for that file.

Notes:
- `--zone-code-field` / `--zone-name-field` are property keys in each feature.
- For non-FeatureCollection inputs, pass `--geometry-field` (e.g. `the_geom`).
- `--props-fields` is optional; if set, those fields are stored on `zoning_districts.properties` to support overlay flags without fully curated `zoning_rules`.
- The loader dissolves polygons by `(zone_code, zone_name)` into a single multipolygon per zone.

Migration note:
- If you’re upgrading an existing DB, apply `backend/db/migrations/002_zoning_districts_properties.sql` before re-importing zoning, otherwise the importer will fail trying to write `properties`.

## Import permits (JSON export)

Example:

`node scripts/import-permits-json.mjs --city seattle --file /path/to/permits.json --permit-number-field permit_number --permit-type-field permit_type --project-type-field project_type --application-date-field application_date --issue-date-field issue_date --processing-days-field processing_days --status-field status --address-field address --lat-field lat --lng-field lng`

Examples for the downloaded files in `backend/data/`:

- Seattle: `--file ../backend/data/seattle/permits/permits.json --permit-number-field permitnum --permit-type-field permittypemapped --status-field statuscurrent --address-field originaladdress1 --lat-field latitude --lng-field longitude`
- Austin: `--file ../backend/data/austin/permits/permits.json --permit-number-field permit_number --permit-type-field permit_type_desc --project-type-field work_class --application-date-field applieddate --issue-date-field issue_date --status-field status_current --address-field original_address1 --lat-field latitude --lng-field longitude`
- Chicago: `--file ../backend/data/chicago/permits/permits.json --permit-number-field permit_ --permit-type-field permit_type --project-type-field review_type --application-date-field application_start_date --issue-date-field issue_date --processing-days-field processing_time --lat-field latitude --lng-field longitude`

Notes:
- Field args accept dot paths (e.g. `location.latitude`).
- Uses `ON CONFLICT (city, permit_number)` upserts.
- If a dataset doesn’t include `processing_days`, the importer derives it from `application_date` → `issue_date` when those fields are provided.

## Bootstrap zoning rules (empty rows)

This creates one `zoning_rules` row per `(city, zone_code)` so you can iteratively fill the rule fields.

All fields are left blank/default except `source_url` and a placeholder `parking_rules.summary`.

`node scripts/bootstrap-zoning-rules.mjs`

Limit to a city:

`node scripts/bootstrap-zoning-rules.mjs --city seattle`

## Import zoning rules (JSON)

Upserts curated rules into `zoning_rules` from a JSON array using the schema fields from `backend/db/migrations/001_init.sql`.

`node scripts/import-zoning-rules-json.mjs --file /path/to/zoning_rules.json`

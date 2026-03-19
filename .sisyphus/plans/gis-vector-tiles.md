# GIS Dashboard Vector Tile Optimization

## TL;DR

> **Quick Summary**: Migrate GIS dashboard from react-leaflet + JSONB coordinates to MapLibre GL JS + PostGIS + Martin tile server for 100x rendering performance improvement with 10K+ complex polygons.
> 
> **Deliverables**:
> - PostGIS-enabled database with native geometry storage
> - Martin tile server with zoom-dependent simplification
> - Nginx reverse proxy with 7-day tile caching
> - MapLibre GL JS frontend with WebGL rendering
> - Updated SHP import flow for PostGIS geometry
> 
> **Estimated Effort**: Large (3-5 days)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: T1 → T3 → T5 → T8 → T11 → T13 → Final

---

## Context

### Original Request
User has a GIS dashboard visualizing SHP multipolygon data that's loading slowly. Dataset is 1,000-10,000 features with 1,000+ points per polygon (10M+ total coordinates). Users need ALL polygons visible at every zoom level.

### Interview Summary
**Key Discussions**:
- **Scale**: 1K-10K features, 1K+ points each — requires architectural solution
- **Overview Required**: YES — viewport-based loading not acceptable
- **Interaction**: Minimal — just selection, basic info display
- **Target Load**: 2-5 seconds acceptable
- **Infrastructure**: Self-hosted Docker, full control, tile server acceptable
- **Approach**: Full vector tile architecture immediately (not phased)
- **Data**: Can re-import — no migration complexity

**Research Findings**:
- Martin tile server is 6-7x faster than pg_tileserv
- Drizzle ORM supports PostGIS geometry columns natively
- MapLibre feature-state enables zero-React-render selection
- Current coordinates stored as `[lat, lng]` — must swap to `[lng, lat]` for PostGIS

### Metis Review
**Identified Gaps** (addressed in guardrails):
- Coordinate order swap during migration
- MultiPolygon structure preservation
- Martin ID column configuration for feature-state
- `ST_MakeValid()` for imported geometries
- Nginx cache invalidation on import

---

## Work Objectives

### Core Objective
Replace DOM-based react-leaflet rendering with WebGL-powered MapLibre GL JS consuming vector tiles from PostGIS via Martin, achieving sub-5-second load times for 10K+ complex polygons.

### Concrete Deliverables
- `docker-compose.yml` updated with PostGIS, Martin, Nginx services
- `packages/db/src/schema/mines.ts` with PostGIS geometry column + GIST index
- PostGIS function for zoom-dependent tile generation with simplification
- `apps/web/src/components/map/MapViewer.tsx` rewritten for MapLibre GL JS
- `apps/web/src/components/upload/ShpUploader.tsx` updated for PostGIS import
- Nginx configuration with tile caching

### Definition of Done
- [ ] `docker-compose up` starts all services without errors
- [ ] `curl http://localhost:3001/tiles/mine_features/8/123/80.pbf` returns protobuf
- [ ] Browser loads 10K polygons in <5 seconds
- [ ] Clicking polygon highlights it without React re-render

### Must Have
- PostGIS extension enabled in PostgreSQL
- Native geometry storage with SRID 4326
- GIST spatial index on geometry column
- Zoom-dependent simplification (3 tiers)
- Nginx tile caching with 7-day TTL
- Feature selection via MapLibre feature-state
- SHP import creates PostGIS geometry

### Must NOT Have (Guardrails)
- NO clustering (user needs ALL polygons visible)
- NO property-based filtering (visualization only)
- NO custom basemap styling (keep existing Google/OSM toggle)
- NO Redis tile caching (Nginx file cache only)
- NO `ST_Simplify` (use `ST_SimplifyPreserveTopology` only)
- NO authentication changes (keep existing Better-Auth)
- NO unit tests for PostGIS functions (integration tests sufficient)
- NO flattening MultiPolygons to separate features

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (no test framework currently)
- **Automated tests**: None (Agent-Executed QA only)
- **Framework**: N/A

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Infrastructure**: Use Bash (curl, docker, psql) — verify services, responses, configs
- **Frontend/UI**: Use Playwright — navigate, interact, assert DOM, screenshot
- **API**: Use Bash (curl) — send requests, assert status + response fields

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Infrastructure Foundation — START IMMEDIATELY):
├── Task 1: Update Docker Compose for PostGIS [quick]
├── Task 2: Add PostGIS extension migration [quick]
└── Task 3: Update mine_feature schema with geometry column [quick]

Wave 2 (Tile Infrastructure — after Wave 1):
├── Task 4: Create PostGIS tile function with simplification [deep]
├── Task 5: Add Martin tile server to Docker stack [quick]
├── Task 6: Add Nginx reverse proxy with tile caching [quick]
└── Task 7: Install MapLibre dependencies [quick]

Wave 3 (Data & Frontend — after Wave 2):
├── Task 8: Create data migration script (JSONB → geometry) [unspecified-high]
├── Task 9: Rewrite MapViewer for MapLibre GL JS [visual-engineering]
├── Task 10: Implement feature-state selection [visual-engineering]
└── Task 11: Update LayerPanel for MapLibre integration [visual-engineering]

Wave 4 (Import & Cleanup — after Wave 3):
├── Task 12: Update ShpUploader for PostGIS import [unspecified-high]
├── Task 13: Update API routes for tile-based architecture [unspecified-high]
└── Task 14: Remove legacy code and JSONB column [quick]

Wave FINAL (Verification — after ALL tasks):
├── Task F1: Plan compliance audit [oracle]
├── Task F2: Code quality review [unspecified-high]
├── Task F3: End-to-end QA [unspecified-high]
└── Task F4: Scope fidelity check [deep]
→ Present results → Get explicit user okay

Critical Path: T1 → T3 → T5 → T8 → T11 → T13 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 4 (Waves 2 & 3)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|------------|--------|
| 1 | — | 2, 3, 5, 6 |
| 2 | 1 | 3, 4 |
| 3 | 2 | 4, 8 |
| 4 | 2, 3 | 5, 8 |
| 5 | 1, 4 | 8, 9 |
| 6 | 1 | 8, 9 |
| 7 | — | 9, 10, 11 |
| 8 | 3, 4, 5, 6 | 9, 12 |
| 9 | 5, 6, 7, 8 | 10, 11 |
| 10 | 9 | 11 |
| 11 | 9, 10 | 12, 13 |
| 12 | 8, 11 | 13, 14 |
| 13 | 11, 12 | 14 |
| 14 | 12, 13 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1-T3 → `quick`
- **Wave 2**: 4 tasks — T4 → `deep`, T5-T7 → `quick`
- **Wave 3**: 4 tasks — T8, T13 → `unspecified-high`, T9-T11 → `visual-engineering`
- **Wave 4**: 3 tasks — T12-T13 → `unspecified-high`, T14 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2-F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Update Docker Compose for PostGIS Image

  **What to do**:
  - Change `postgres:16-alpine` to `postgis/postgis:16-3.4` in `docker-compose.db.yml`
  - Add health check for PostGIS readiness
  - Verify image pulls successfully

  **Must NOT do**:
  - Don't modify database credentials or ports
  - Don't add any other services yet

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file edit, Docker config change
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 2, 3, 5, 6
  - **Blocked By**: None

  **References**:
  - `docker-compose.db.yml` — Current PostgreSQL service definition to modify
  - PostGIS Docker Hub: `postgis/postgis:16-3.4` — Official image tag

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: PostGIS image starts successfully
    Tool: Bash
    Preconditions: Docker daemon running, no existing containers
    Steps:
      1. Run: docker-compose -f docker-compose.db.yml down -v
      2. Run: docker-compose -f docker-compose.db.yml up -d
      3. Wait 10 seconds for startup
      4. Run: docker-compose -f docker-compose.db.yml ps | grep goldeneye
    Expected Result: Container status shows "Up" and "healthy"
    Failure Indicators: Container status "Exited" or "unhealthy"
    Evidence: .sisyphus/evidence/task-1-postgis-startup.txt

  Scenario: PostGIS extension available
    Tool: Bash
    Preconditions: Container running from previous scenario
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "SELECT PostGIS_Version();"
    Expected Result: Returns version string like "3.4.0" (not "extension not found")
    Failure Indicators: Error message about missing extension
    Evidence: .sisyphus/evidence/task-1-postgis-version.txt
  ```

  **Commit**: YES (groups with 2, 3)
  - Message: `feat(infra): upgrade PostgreSQL to PostGIS image`
  - Files: `docker-compose.db.yml`
  - Pre-commit: `docker-compose -f docker-compose.db.yml config`

- [x] 2. Add PostGIS Extension Migration

  **What to do**:
  - Create SQL migration file to enable PostGIS extension
  - Add `CREATE EXTENSION IF NOT EXISTS postgis;` statement
  - Run migration via Drizzle

  **Must NOT do**:
  - Don't modify existing schema yet
  - Don't add geometry columns yet

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Simple SQL statement, Drizzle migration
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T1)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 3, 4
  - **Blocked By**: Task 1

  **References**:
  - `packages/db/drizzle.config.ts` — Drizzle migration configuration
  - `packages/db/src/migrations/` — Existing migration folder structure
  - PostGIS docs: `CREATE EXTENSION postgis` — Required syntax

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Extension migration runs successfully
    Tool: Bash
    Preconditions: PostGIS Docker container running
    Steps:
      1. Run: bun run db:push (or db:migrate)
      2. Run: docker exec goldeneye-db psql -U postgres -c "SELECT extname FROM pg_extension WHERE extname = 'postgis';"
    Expected Result: Returns row with "postgis"
    Failure Indicators: Empty result or error
    Evidence: .sisyphus/evidence/task-2-extension-enabled.txt

  Scenario: Extension already exists (idempotent)
    Tool: Bash
    Preconditions: Extension already enabled
    Steps:
      1. Run: bun run db:push again
    Expected Result: No error, migration is idempotent
    Failure Indicators: "extension already exists" error
    Evidence: .sisyphus/evidence/task-2-idempotent.txt
  ```

  **Commit**: YES (groups with 1, 3)
  - Message: `feat(db): enable PostGIS extension`
  - Files: `packages/db/src/migrations/*.sql`
  - Pre-commit: `bun run db:push`

- [x] 3. Update mine_feature Schema with Geometry Column

  **What to do**:
  - Add `geom` column of type `geometry(MultiPolygon, 4326)` to `mineFeature` table
  - Keep existing `coordinates` JSONB column (for now)
  - Add GIST spatial index on `geom` column
  - Update TypeScript types

  **Must NOT do**:
  - Don't remove `coordinates` column yet
  - Don't migrate data yet
  - Don't change existing queries

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema addition, Drizzle syntax
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T2)
  - **Parallel Group**: Wave 1
  - **Blocks**: Tasks 4, 8
  - **Blocked By**: Task 2

  **References**:
  - `packages/db/src/schema/mines.ts:11-34` — Current mineFeature schema definition
  - Drizzle PostGIS docs — geometry column syntax: `geometry('geom', { type: 'multipolygon', srid: 4326 })`
  - `packages/db/src/schema/index.ts` — Schema exports

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Geometry column created with correct type
    Tool: Bash
    Preconditions: Extension enabled, schema pushed
    Steps:
      1. Run: bun run db:push
      2. Run: docker exec goldeneye-db psql -U postgres -c "\d mine_feature" | grep geom
    Expected Result: Column "geom" with type "geometry(MultiPolygon,4326)"
    Failure Indicators: Column missing or wrong type
    Evidence: .sisyphus/evidence/task-3-geom-column.txt

  Scenario: GIST spatial index exists
    Tool: Bash
    Preconditions: Schema pushed
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "\di mine_feature*"
    Expected Result: Index "mine_feature_geom_idx" with method "gist"
    Failure Indicators: Index missing or wrong method
    Evidence: .sisyphus/evidence/task-3-gist-index.txt

  Scenario: TypeScript types compile
    Tool: Bash
    Preconditions: Schema updated
    Steps:
      1. Run: bun run check-types
    Expected Result: No type errors in packages/db
    Failure Indicators: Type errors mentioning geometry
    Evidence: .sisyphus/evidence/task-3-types.txt
  ```

  **Commit**: YES (groups with 1, 2)
  - Message: `feat(db): add geometry column with spatial index to mine_feature`
  - Files: `packages/db/src/schema/mines.ts`
  - Pre-commit: `bun run db:push && bun run check-types`

- [x] 4. Create PostGIS Tile Function with Simplification

  **What to do**:
  - Create SQL function `tile_mine_features(z, x, y)` returning MVT bytea
  - Implement 3-tier zoom-based simplification:
    - z0-7: Aggressive (tolerance * 10)
    - z8-12: Moderate (tolerance * 3)
    - z13+: No simplification
  - Use `ST_SimplifyPreserveTopology` (NOT `ST_Simplify`)
  - Filter features by tile bounds with `ST_Intersects`
  - Include `id`, `name`, `layer_id` in tile properties

  **Must NOT do**:
  - Don't use `ST_Simplify` (breaks topology)
  - Don't include all properties in tile (bloat)
  - Don't add clustering logic

  **Recommended Agent Profile**:
  - **Category**: `deep`
    - Reason: Complex SQL function with PostGIS spatial operations
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T2, T3)
  - **Parallel Group**: Wave 2
  - **Blocks**: Tasks 5, 8
  - **Blocked By**: Tasks 2, 3

  **References**:
  - PostGIS `ST_AsMVT` docs — MVT generation syntax
  - PostGIS `ST_SimplifyPreserveTopology` docs — Simplification function
  - PostGIS `ST_TileEnvelope` docs — Tile bounds calculation
  - Formula: `tolerance = 40075016.686 / (256 * POW(2, zoom))` for pixel-based simplification

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Function returns valid MVT at z8
    Tool: Bash
    Preconditions: Function created, some test data exists
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "SELECT length(tile_mine_features(8, 128, 128));"
    Expected Result: Returns integer > 0 (non-empty tile)
    Failure Indicators: NULL, 0, or function error
    Evidence: .sisyphus/evidence/task-4-mvt-z8.txt

  Scenario: Simplification reduces vertex count at low zoom
    Tool: Bash
    Preconditions: Function created, complex polygon data exists
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "SELECT ST_NPoints(geom) as original, ST_NPoints(ST_SimplifyPreserveTopology(geom, 40075016.686 / (256 * POW(2, 4)) * 10)) as simplified FROM mine_feature LIMIT 1;"
    Expected Result: simplified < original (significant reduction)
    Failure Indicators: simplified >= original
    Evidence: .sisyphus/evidence/task-4-simplification.txt

  Scenario: Function handles empty tile gracefully
    Tool: Bash
    Preconditions: Function created
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "SELECT tile_mine_features(0, 0, 0);" (tile with no data)
    Expected Result: Returns empty bytea or minimal MVT (no error)
    Failure Indicators: Function error or exception
    Evidence: .sisyphus/evidence/task-4-empty-tile.txt
  ```

  **Commit**: YES
  - Message: `feat(db): add tile generation function with zoom-based simplification`
  - Files: `packages/db/src/migrations/*.sql` or function file
  - Pre-commit: Function creation succeeds

- [x] 5. Add Martin Tile Server to Docker Stack

  **What to do**:
  - Add Martin service to `docker-compose.yml`
  - Configure function source pointing to `tile_mine_features`
  - Set `id_columns: id` for feature-state support
  - Configure connection to PostGIS database
  - Expose port 3001 for tile requests

  **Must NOT do**:
  - Don't use table source (function source enables simplification)
  - Don't configure multiple databases
  - Don't add authentication to Martin

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Docker Compose configuration
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Tasks 1, 4

  **References**:
  - Martin docs: Function source configuration
  - `docker-compose.yml` — Existing service definitions pattern
  - Martin Docker image: `ghcr.io/maplibre/martin:v0.13`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Martin container starts and connects to PostGIS
    Tool: Bash
    Preconditions: PostGIS container running, tile function exists
    Steps:
      1. Run: docker-compose up -d martin
      2. Wait 5 seconds
      3. Run: docker-compose logs martin | tail -20
    Expected Result: Logs show "Connected to database" and "Function source: tile_mine_features"
    Failure Indicators: Connection errors or "no function sources found"
    Evidence: .sisyphus/evidence/task-5-martin-startup.txt

  Scenario: Martin serves tiles via HTTP
    Tool: Bash
    Preconditions: Martin container running
    Steps:
      1. Run: curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/tile_mine_features/8/128/128
    Expected Result: HTTP 200
    Failure Indicators: 404, 500, or connection refused
    Evidence: .sisyphus/evidence/task-5-martin-tile.txt

  Scenario: Tile response is valid protobuf
    Tool: Bash
    Preconditions: Martin serving tiles
    Steps:
      1. Run: curl -s http://localhost:3001/tile_mine_features/8/128/128 | file -
    Expected Result: Output contains "data" or "application/x-protobuf" (not "ASCII text" or "HTML")
    Failure Indicators: HTML error page or text response
    Evidence: .sisyphus/evidence/task-5-protobuf.txt
  ```

  **Commit**: YES
  - Message: `feat(infra): add Martin tile server with function source`
  - Files: `docker-compose.yml`
  - Pre-commit: `docker-compose config`

- [x] 6. Add Nginx Reverse Proxy with Tile Caching

  **What to do**:
  - Add Nginx service to `docker-compose.yml`
  - Configure `proxy_cache` for `/tiles/*` path
  - Set cache TTL: 7 days for z0-12, 1 day for z13+
  - Add `X-Cache-Status` header for debugging
  - Proxy to Martin on port 3001

  **Must NOT do**:
  - Don't add Redis caching (file cache only)
  - Don't configure SSL (local development)
  - Don't add rate limiting

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Nginx configuration file
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: Task 1

  **References**:
  - `apps/web/nginx.conf` — Existing Nginx config pattern
  - Nginx `proxy_cache` directive docs
  - Nginx `proxy_cache_valid` directive docs

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Nginx proxies to Martin successfully
    Tool: Bash
    Preconditions: Martin and Nginx containers running
    Steps:
      1. Run: curl -s -o /dev/null -w "%{http_code}" http://localhost/tiles/tile_mine_features/8/128/128
    Expected Result: HTTP 200
    Failure Indicators: 502 Bad Gateway or 404
    Evidence: .sisyphus/evidence/task-6-nginx-proxy.txt

  Scenario: Cache MISS on first request
    Tool: Bash
    Preconditions: Fresh cache, Nginx running
    Steps:
      1. Run: docker exec nginx rm -rf /var/cache/nginx/tiles/* 2>/dev/null || true
      2. Run: curl -sI http://localhost/tiles/tile_mine_features/8/128/128 | grep X-Cache-Status
    Expected Result: X-Cache-Status: MISS
    Failure Indicators: Header missing or already HIT
    Evidence: .sisyphus/evidence/task-6-cache-miss.txt

  Scenario: Cache HIT on second request
    Tool: Bash
    Preconditions: First request completed
    Steps:
      1. Run: curl -sI http://localhost/tiles/tile_mine_features/8/128/128 | grep X-Cache-Status
    Expected Result: X-Cache-Status: HIT
    Failure Indicators: MISS or header missing
    Evidence: .sisyphus/evidence/task-6-cache-hit.txt
  ```

  **Commit**: YES
  - Message: `feat(infra): add Nginx reverse proxy with tile caching`
  - Files: `docker-compose.yml`, `nginx/nginx.conf`
  - Pre-commit: `docker-compose config`

- [x] 7. Install MapLibre Dependencies

  **What to do**:
  - Install `maplibre-gl` and `react-map-gl` in apps/web
  - Add MapLibre CSS import
  - Update TypeScript config if needed
  - Verify packages install without conflicts

  **Must NOT do**:
  - Don't remove react-leaflet yet
  - Don't modify existing components yet

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Package installation
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6)
  - **Blocks**: Tasks 9, 10, 11
  - **Blocked By**: None

  **References**:
  - `apps/web/package.json` — Current dependencies
  - react-map-gl docs: Installation guide
  - MapLibre GL JS docs: CSS requirements

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Packages install without errors
    Tool: Bash
    Preconditions: Clean node_modules state
    Steps:
      1. Run: cd apps/web && bun add maplibre-gl react-map-gl
      2. Run: bun install
    Expected Result: Installation completes with exit code 0
    Failure Indicators: Peer dependency warnings or install errors
    Evidence: .sisyphus/evidence/task-7-install.txt

  Scenario: TypeScript types resolve
    Tool: Bash
    Preconditions: Packages installed
    Steps:
      1. Create test file: echo "import maplibregl from 'maplibre-gl';" > /tmp/test.ts
      2. Run: bun run check-types
    Expected Result: No type errors for maplibre imports
    Failure Indicators: "Cannot find module" errors
    Evidence: .sisyphus/evidence/task-7-types.txt
  ```

  **Commit**: YES
  - Message: `feat(web): add MapLibre GL JS dependencies`
  - Files: `apps/web/package.json`, `bun.lock`
  - Pre-commit: `bun install && bun run check-types`

- [ ] 8. Create Data Migration Script (JSONB → Geometry)

  **What to do**:
  - Write SQL migration script to populate `geom` column from `coordinates` JSONB
  - **CRITICAL**: Swap coordinate order from `[lat, lng]` (Leaflet) to `[lng, lat]` (GeoJSON/PostGIS)
  - Use `ST_GeomFromGeoJSON` for conversion
  - Run `ST_MakeValid()` on all geometries to fix any invalid shapes
  - Process in batches of 1000 to avoid long transactions
  - Verify all features migrated (count match)

  **Must NOT do**:
  - Don't drop the `coordinates` column yet
  - Don't modify the original JSONB data
  - Don't skip `ST_MakeValid()` step

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Complex SQL with coordinate transformation and validation
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Wave 1 & 2)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 9, 12
  - **Blocked By**: Tasks 3, 4, 5, 6

  **References**:
  - `packages/db/src/schema/mines.ts:24` — Current `coordinates` JSONB structure: `[lat, lng][][]`
  - PostGIS `ST_GeomFromGeoJSON` docs — GeoJSON parsing
  - PostGIS `ST_MakeValid` docs — Geometry validation
  - `apps/web/src/components/upload/ShpUploader.tsx:85-98` — Shows current coordinate format

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All features migrated (count match)
    Tool: Bash
    Preconditions: Migration script exists, JSONB data present
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "SELECT COUNT(*) FROM mine_feature WHERE coordinates IS NOT NULL;"
      2. Run migration script
      3. Run: docker exec goldeneye-db psql -U postgres -c "SELECT COUNT(*) FROM mine_feature WHERE geom IS NOT NULL;"
    Expected Result: Both counts are equal and > 0
    Failure Indicators: geom count < coordinates count
    Evidence: .sisyphus/evidence/task-8-count-match.txt

  Scenario: Coordinate order swapped correctly
    Tool: Bash
    Preconditions: Migration completed
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "SELECT ST_X(ST_PointN(ST_ExteriorRing(ST_GeometryN(geom, 1)), 1)), ST_Y(ST_PointN(ST_ExteriorRing(ST_GeometryN(geom, 1)), 1)) FROM mine_feature LIMIT 1;"
      2. Compare with original JSONB first coordinate
    Expected Result: X = original lng, Y = original lat (swapped from [lat,lng] to [lng,lat])
    Failure Indicators: X = lat, Y = lng (not swapped)
    Evidence: .sisyphus/evidence/task-8-coord-swap.txt

  Scenario: All geometries are valid
    Tool: Bash
    Preconditions: Migration completed
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "SELECT COUNT(*) FROM mine_feature WHERE NOT ST_IsValid(geom);"
    Expected Result: Count = 0 (all valid)
    Failure Indicators: Count > 0
    Evidence: .sisyphus/evidence/task-8-valid-geom.txt

  Scenario: Spatial index is used
    Tool: Bash
    Preconditions: Migration completed, index exists
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "EXPLAIN ANALYZE SELECT * FROM mine_feature WHERE geom && ST_MakeEnvelope(-180,-90,180,90,4326);"
    Expected Result: Output contains "Index Scan using mine_feature_geom_idx"
    Failure Indicators: "Seq Scan" in output
    Evidence: .sisyphus/evidence/task-8-index-usage.txt
  ```

  **Commit**: YES
  - Message: `feat(db): migrate JSONB coordinates to PostGIS geometry`
  - Files: `packages/db/src/migrations/*.sql`
  - Pre-commit: Count verification query

- [ ] 9. Rewrite MapViewer for MapLibre GL JS

  **What to do**:
  - Create new `MapViewerGL.tsx` component using `react-map-gl` with MapLibre
  - Add vector tile source pointing to Martin tiles via Nginx
  - Render polygons with `fill` layer type
  - Keep existing basemap toggle (satellite/street)
  - Implement `BoundsController` equivalent for auto-fit
  - Apply layer colors from props (per-layer styling)

  **Must NOT do**:
  - Don't delete old `MapViewer.tsx` yet (keep for reference)
  - Don't implement selection yet (Task 10)
  - Don't add custom basemap styles
  - Don't add clustering

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Frontend map component with WebGL rendering
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on Wave 2)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 10, 11
  - **Blocked By**: Tasks 5, 6, 7, 8

  **References**:
  - `apps/web/src/components/map/MapViewer.tsx` — Current implementation to replace
  - react-map-gl docs: `<Map>`, `<Source>`, `<Layer>` components
  - MapLibre GL JS style spec: `fill` layer type
  - `apps/web/src/routes/index.tsx:87-102` — How MapViewer is called with props

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Map renders with WebGL canvas
    Tool: Playwright
    Preconditions: App running, tiles available
    Steps:
      1. Navigate to http://localhost:3001/
      2. Wait for selector: canvas.maplibregl-canvas
      3. Take screenshot
    Expected Result: Canvas element exists, screenshot shows map
    Failure Indicators: Canvas missing or blank
    Evidence: .sisyphus/evidence/task-9-webgl-canvas.png

  Scenario: Polygons render from vector tiles
    Tool: Playwright
    Preconditions: Map loaded, data migrated
    Steps:
      1. Navigate to http://localhost:3001/
      2. Wait for network idle
      3. Execute: map.queryRenderedFeatures({ layers: ['polygons-fill'] })
      4. Count features
    Expected Result: Feature count > 0
    Failure Indicators: Empty array or layer not found
    Evidence: .sisyphus/evidence/task-9-features-render.txt

  Scenario: Basemap toggle works
    Tool: Playwright
    Preconditions: Map rendered
    Steps:
      1. Click satellite radio button
      2. Wait 1 second
      3. Click street radio button
      4. Verify no console errors
    Expected Result: Map style changes without errors
    Failure Indicators: Console errors or style not changing
    Evidence: .sisyphus/evidence/task-9-basemap-toggle.png

  Scenario: Auto-fit bounds on load
    Tool: Playwright
    Preconditions: Map rendered with data
    Steps:
      1. Navigate to http://localhost:3001/
      2. Wait for load
      3. Get map bounds via: map.getBounds()
    Expected Result: Bounds contain feature data (not default world view)
    Failure Indicators: Bounds are default [-180,-90,180,90]
    Evidence: .sisyphus/evidence/task-9-auto-fit.txt
  ```

  **Commit**: YES
  - Message: `feat(web): add MapLibre GL JS map viewer component`
  - Files: `apps/web/src/components/map/MapViewerGL.tsx`
  - Pre-commit: `bun run check-types`

- [ ] 10. Implement Feature-State Selection

  **What to do**:
  - Add click handler using `interactiveLayerIds`
  - Use `map.setFeatureState()` for hover/selection highlighting
  - Update fill layer paint to use `feature-state` expression for selected color
  - Pass selected feature info to parent via callback
  - Ensure NO React re-renders on selection (feature-state only)

  **Must NOT do**:
  - Don't re-render React components on hover/click
  - Don't load full properties into tiles (just id, name, layer_id)
  - Don't add sidebar or popup (minimal interaction)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: MapLibre feature-state API, paint expressions
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T9)
  - **Parallel Group**: Wave 3
  - **Blocks**: Task 11
  - **Blocked By**: Task 9

  **References**:
  - `apps/web/src/components/map/MapViewer.tsx:77-139` — Current click handler pattern
  - MapLibre GL JS docs: `setFeatureState` API
  - MapLibre style spec: `feature-state` expression
  - react-map-gl docs: `interactiveLayerIds` prop

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Click highlights polygon without React re-render
    Tool: Playwright
    Preconditions: Map rendered with features
    Steps:
      1. Set window.__REACT_RENDER_COUNT__ = 0 on map component
      2. Click on a polygon
      3. Check window.__REACT_RENDER_COUNT__
      4. Verify polygon color changed (screenshot)
    Expected Result: Render count = 0, polygon visually highlighted
    Failure Indicators: Render count > 0 or no visual change
    Evidence: .sisyphus/evidence/task-10-no-rerender.png

  Scenario: Hover shows visual feedback
    Tool: Playwright
    Preconditions: Map rendered
    Steps:
      1. Hover over polygon
      2. Take screenshot
      3. Move mouse away
      4. Take screenshot
    Expected Result: Different visual state on hover vs no-hover
    Failure Indicators: No visual difference
    Evidence: .sisyphus/evidence/task-10-hover.png

  Scenario: Selection callback fires with feature data
    Tool: Playwright
    Preconditions: Map rendered, callback wired
    Steps:
      1. Set up listener: window.__SELECTED__ = null; onMineClick = (f) => window.__SELECTED__ = f;
      2. Click polygon
      3. Check window.__SELECTED__
    Expected Result: Object with id, name, layerId properties
    Failure Indicators: null or missing properties
    Evidence: .sisyphus/evidence/task-10-callback.txt
  ```

  **Commit**: YES
  - Message: `feat(web): implement feature-state selection in MapViewer`
  - Files: `apps/web/src/components/map/MapViewerGL.tsx`
  - Pre-commit: `bun run check-types`

- [ ] 11. Update LayerPanel for MapLibre Integration

  **What to do**:
  - Update LayerPanel to work with MapLibre layer visibility
  - Connect color/opacity changes to MapLibre `setPaintProperty`
  - Ensure visibility toggle updates map without full re-render
  - Wire up to new MapViewerGL component in index.tsx
  - Remove old MapViewer import, use MapViewerGL

  **Must NOT do**:
  - Don't add drag-reorder or grouping
  - Don't change LayerPanel UI design
  - Don't add layer search/filter

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: React component integration with MapLibre
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T9, T10)
  - **Parallel Group**: Wave 3
  - **Blocks**: Tasks 12, 13
  - **Blocked By**: Tasks 9, 10

  **References**:
  - `apps/web/src/components/map/LayerPanel.tsx` — Current implementation
  - `apps/web/src/routes/index.tsx:72-84` — Color/opacity change handlers
  - MapLibre GL JS docs: `setPaintProperty` method
  - MapLibre GL JS docs: `setLayoutProperty` for visibility

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Layer visibility toggle works
    Tool: Playwright
    Preconditions: Map rendered, LayerPanel visible
    Steps:
      1. Note initial polygon count
      2. Click visibility checkbox for a layer
      3. Count rendered features again
    Expected Result: Feature count decreases when layer hidden
    Failure Indicators: No change in feature count
    Evidence: .sisyphus/evidence/task-11-visibility.png

  Scenario: Color change updates map immediately
    Tool: Playwright
    Preconditions: Map rendered, LayerPanel visible
    Steps:
      1. Click color swatch for a layer
      2. Select different color
      3. Take screenshot
    Expected Result: Polygon color changes on map
    Failure Indicators: Color unchanged
    Evidence: .sisyphus/evidence/task-11-color.png

  Scenario: Opacity slider updates map
    Tool: Playwright
    Preconditions: Map rendered
    Steps:
      1. Drag opacity slider to 0.2
      2. Take screenshot
    Expected Result: Polygons visibly more transparent
    Failure Indicators: No visual change
    Evidence: .sisyphus/evidence/task-11-opacity.png
  ```

  **Commit**: YES
  - Message: `feat(web): integrate LayerPanel with MapLibre GL JS`
  - Files: `apps/web/src/components/map/LayerPanel.tsx`, `apps/web/src/routes/index.tsx`
  - Pre-commit: `bun run check-types`

- [ ] 12. Update ShpUploader for PostGIS Import

  **What to do**:
  - Modify ShpUploader to output coordinates in `[lng, lat]` order (GeoJSON standard)
  - Update server API to convert GeoJSON to PostGIS geometry via `ST_GeomFromGeoJSON`
  - Run `ST_MakeValid()` on imported geometries
  - Preserve MultiPolygon structure (don't flatten)
  - Invalidate Nginx tile cache after import

  **Must NOT do**:
  - Don't change upload UI
  - Don't add file validation beyond current
  - Don't keep JSONB coordinates (direct to geometry)

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: Full-stack change: frontend, API, database
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T8, T11)
  - **Parallel Group**: Wave 4
  - **Blocks**: Tasks 13, 14
  - **Blocked By**: Tasks 8, 11

  **References**:
  - `apps/web/src/components/upload/ShpUploader.tsx:61-115` — Current coordinate transformation
  - `apps/server/src/index.ts:54-109` — POST /api/layers endpoint
  - `apps/web/src/lib/api.ts:52-68` — saveLayer function
  - PostGIS `ST_GeomFromGeoJSON` docs

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Upload creates valid PostGIS geometry
    Tool: Playwright + Bash
    Preconditions: Admin logged in, test SHP file ready
    Steps:
      1. Navigate to /admin
      2. Fill layer name: "Test Upload"
      3. Upload test.shp + test.dbf
      4. Wait for success toast
      5. Run: docker exec goldeneye-db psql -U postgres -c "SELECT COUNT(*) FROM mine_feature WHERE geom IS NOT NULL AND layer_id = (SELECT id FROM mine_layer ORDER BY imported_at DESC LIMIT 1);"
    Expected Result: Count > 0, matches uploaded feature count
    Failure Indicators: Count = 0 or geometry NULL
    Evidence: .sisyphus/evidence/task-12-upload-geom.txt

  Scenario: Coordinates stored in lng,lat order
    Tool: Bash
    Preconditions: Upload completed
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "SELECT ST_AsGeoJSON(geom)::json->'coordinates'->0->0->0 FROM mine_feature ORDER BY imported_at DESC LIMIT 1;"
    Expected Result: First coordinate pair is [lng, lat] (lng typically larger magnitude for most data)
    Failure Indicators: Order appears reversed
    Evidence: .sisyphus/evidence/task-12-coord-order.txt

  Scenario: Tile cache invalidated after import
    Tool: Bash
    Preconditions: Tiles cached, new upload
    Steps:
      1. Request tile, note X-Cache-Status: HIT
      2. Upload new layer
      3. Request same tile
    Expected Result: X-Cache-Status: MISS (cache invalidated)
    Failure Indicators: Still HIT (stale tiles)
    Evidence: .sisyphus/evidence/task-12-cache-invalidate.txt

  Scenario: MultiPolygon structure preserved
    Tool: Bash
    Preconditions: Upload MultiPolygon SHP
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "SELECT ST_GeometryType(geom) FROM mine_feature ORDER BY imported_at DESC LIMIT 1;"
    Expected Result: "ST_MultiPolygon"
    Failure Indicators: "ST_Polygon" (flattened)
    Evidence: .sisyphus/evidence/task-12-multipolygon.txt
  ```

  **Commit**: YES
  - Message: `feat(web): update SHP import for direct PostGIS geometry`
  - Files: `apps/web/src/components/upload/ShpUploader.tsx`, `apps/server/src/index.ts`, `apps/web/src/lib/api.ts`
  - Pre-commit: `bun run check-types`

- [ ] 13. Update API Routes for Tile-Based Architecture

  **What to do**:
  - Modify GET /api/layers to return layer metadata only (no features/coordinates)
  - Features are now served via tiles, not JSON API
  - Add GET /api/features/:id for on-demand feature properties (click handler)
  - Remove full feature loading from getLayers API
  - Update frontend to use new API shape

  **Must NOT do**:
  - Don't add pagination (tiles handle this)
  - Don't add filtering endpoints
  - Don't remove admin layer management

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: API contract change, frontend update
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (depends on T11, T12)
  - **Parallel Group**: Wave 4
  - **Blocks**: Task 14
  - **Blocked By**: Tasks 11, 12

  **References**:
  - `apps/server/src/index.ts:30-51` — Current GET /api/layers
  - `apps/web/src/lib/api.ts:46-50` — getLayers function
  - `apps/web/src/routes/index.tsx:37-54` — How layers are fetched and used

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: GET /api/layers returns metadata only
    Tool: Bash
    Preconditions: Server running, layers exist
    Steps:
      1. Run: curl -s http://localhost:3000/api/layers | jq '.[0] | keys'
    Expected Result: Keys include id, name, description, importedAt — NOT features or coordinates
    Failure Indicators: "features" or "coordinates" in keys
    Evidence: .sisyphus/evidence/task-13-layers-metadata.txt

  Scenario: Response size significantly reduced
    Tool: Bash
    Preconditions: Large dataset
    Steps:
      1. Run: curl -s http://localhost:3000/api/layers | wc -c
    Expected Result: Response < 10KB (metadata only)
    Failure Indicators: Response > 100KB (features included)
    Evidence: .sisyphus/evidence/task-13-response-size.txt

  Scenario: Feature properties available on-demand
    Tool: Bash
    Preconditions: Feature exists
    Steps:
      1. Run: curl -s http://localhost:3000/api/features/{feature-id}
    Expected Result: Returns full properties JSON
    Failure Indicators: 404 or empty response
    Evidence: .sisyphus/evidence/task-13-feature-detail.txt

  Scenario: Frontend still loads correctly
    Tool: Playwright
    Preconditions: New API deployed
    Steps:
      1. Navigate to http://localhost:3001/
      2. Wait for map to render
      3. Verify LayerPanel shows layers
    Expected Result: Layers visible in panel, map renders
    Failure Indicators: Empty layer panel or errors
    Evidence: .sisyphus/evidence/task-13-frontend.png
  ```

  **Commit**: YES
  - Message: `feat(server): update API to serve layer metadata only, features via tiles`
  - Files: `apps/server/src/index.ts`, `apps/web/src/lib/api.ts`, `apps/web/src/routes/index.tsx`
  - Pre-commit: `bun run check-types`

- [ ] 14. Remove Legacy Code and JSONB Column

  **What to do**:
  - Remove `coordinates` JSONB column from schema
  - Remove old `MapViewer.tsx` component (react-leaflet)
  - Remove react-leaflet dependencies from package.json
  - Remove Redis `layers:all` cache (tiles cached by Nginx now)
  - Clean up unused imports and types

  **Must NOT do**:
  - Don't remove before all other tasks complete
  - Don't remove LayerPanel or other reusable components
  - Don't change authentication

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Deletion and cleanup
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (final cleanup)
  - **Parallel Group**: Wave 4
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 12, 13

  **References**:
  - `packages/db/src/schema/mines.ts:24` — `coordinates` column to remove
  - `apps/web/src/components/map/MapViewer.tsx` — Old component to delete
  - `apps/server/src/index.ts:10,31-38,48,106,121` — Redis cache usage to remove
  - `apps/web/package.json` — react-leaflet, leaflet dependencies

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: JSONB column removed from schema
    Tool: Bash
    Preconditions: Migration applied
    Steps:
      1. Run: docker exec goldeneye-db psql -U postgres -c "\d mine_feature" | grep coordinates
    Expected Result: No output (column doesn't exist)
    Failure Indicators: Column still present
    Evidence: .sisyphus/evidence/task-14-no-jsonb.txt

  Scenario: Old MapViewer component deleted
    Tool: Bash
    Preconditions: Cleanup done
    Steps:
      1. Run: ls apps/web/src/components/map/MapViewer.tsx
    Expected Result: "No such file or directory"
    Failure Indicators: File exists
    Evidence: .sisyphus/evidence/task-14-no-old-viewer.txt

  Scenario: react-leaflet removed from dependencies
    Tool: Bash
    Preconditions: Cleanup done
    Steps:
      1. Run: grep -r "react-leaflet\|leaflet" apps/web/package.json
    Expected Result: No output (dependencies removed)
    Failure Indicators: Dependencies still present
    Evidence: .sisyphus/evidence/task-14-no-leaflet.txt

  Scenario: App still works after cleanup
    Tool: Playwright
    Preconditions: Cleanup done, app restarted
    Steps:
      1. Navigate to http://localhost:3001/
      2. Wait for map to render
      3. Click a polygon
      4. Toggle layer visibility
    Expected Result: All functionality works
    Failure Indicators: Errors or broken features
    Evidence: .sisyphus/evidence/task-14-final-e2e.png

  Scenario: TypeScript compiles without errors
    Tool: Bash
    Preconditions: Cleanup done
    Steps:
      1. Run: bun run check-types
    Expected Result: Exit code 0, no errors
    Failure Indicators: Type errors
    Evidence: .sisyphus/evidence/task-14-types-clean.txt
  ```

  **Commit**: YES
  - Message: `chore(cleanup): remove legacy JSONB storage and react-leaflet`
  - Files: `packages/db/src/schema/mines.ts`, `apps/web/src/components/map/MapViewer.tsx`, `apps/web/package.json`, `apps/server/src/index.ts`
  - Pre-commit: `bun run check-types`

---

## Final Verification Wave

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [ ] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, curl endpoint, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [ ] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + linter. Review all changed files for: `as any`/`@ts-ignore`, empty catches, console.log in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Lint [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [ ] F3. **End-to-End QA** — `unspecified-high` + `playwright` skill
  Start from clean state (docker-compose down -v && docker-compose up). Execute EVERY QA scenario from EVERY task. Test cross-task integration. Save evidence to `.sisyphus/evidence/final-qa/`.
  Output: `Scenarios [N/N pass] | Integration [N/N] | VERDICT`

- [ ] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual diff. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

| Commit | Message | Files | Pre-commit |
|--------|---------|-------|------------|
| 1 | `feat(infra): add PostGIS + Martin + Nginx to Docker stack` | docker-compose.yml, docker-compose.db.yml | docker-compose config |
| 2 | `feat(db): add PostGIS extension and geometry column` | packages/db/src/schema/mines.ts, migration SQL | bun run db:push |
| 3 | `feat(db): add tile generation function with simplification` | SQL function file | psql function test |
| 4 | `feat(db): migrate JSONB coordinates to PostGIS geometry` | migration script | SELECT COUNT(*) verification |
| 5 | `feat(web): replace react-leaflet with MapLibre GL JS` | MapViewer.tsx, package.json | bun run check-types |
| 6 | `feat(web): implement feature-state selection` | MapViewer.tsx, LayerPanel.tsx | bun run check-types |
| 7 | `feat(web): update ShpUploader for PostGIS import` | ShpUploader.tsx, api.ts | bun run check-types |
| 8 | `feat(server): update API for tile-based architecture` | apps/server/src/index.ts | curl test |
| 9 | `chore(db): remove legacy JSONB coordinates column` | schema, migrations | full E2E test |

---

## Success Criteria

### Verification Commands
```bash
# PostGIS enabled
docker exec goldeneye-db psql -U postgres -c "SELECT PostGIS_Version();"
# Expected: "3.4..." or similar

# Tile generation works
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/tiles/mine_features/8/123/80.pbf
# Expected: 200

# Nginx caching works
curl -sI http://localhost/tiles/mine_features/8/123/80.pbf | grep X-Cache-Status
# Expected: HIT (on second request)

# Spatial index used
docker exec goldeneye-db psql -U postgres -c "EXPLAIN ANALYZE SELECT * FROM mine_feature WHERE geom && ST_MakeEnvelope(-180,-90,180,90,4326);" | grep -i index
# Expected: "Index Scan using mine_feature_geom_idx"
```

### Final Checklist
- [ ] All "Must Have" items implemented
- [ ] All "Must NOT Have" items absent from codebase
- [ ] All QA scenarios pass
- [ ] All evidence files present in .sisyphus/evidence/
- [ ] User explicitly approves final verification results

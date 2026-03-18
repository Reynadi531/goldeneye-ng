# Known Issues & Gotchas — GIS Vector Tiles

> Problems encountered, workarounds, and things to watch for.

---

## [2026-03-18T07:20:07Z] Pre-Execution Phase

### Issue 1: Coordinate Order Confusion
**Problem**: Leaflet uses `[lat, lng]`, PostGIS/GeoJSON uses `[lng, lat]`
**Impact**: HIGH — incorrect order renders features in wrong locations
**Mitigation**: 
- Explicit swap in migration script (T8)
- Explicit swap in ShpUploader (T12)
- QA scenarios verify coordinate order
- Manual verification: compare DB query output with known location

---

### Issue 2: MultiPolygon Structure Preservation
**Problem**: Easy to accidentally flatten MultiPolygons to multiple Polygon rows
**Impact**: MEDIUM — breaks geometry integrity, complicates selection
**Mitigation**:
- Use `geometry(MultiPolygon, 4326)` type explicitly
- QA scenario checks `ST_GeometryType(geom)` returns "ST_MultiPolygon"
- Never use `ST_Dump` or array unnesting in import flow

---

### Issue 3: Invalid Geometries from SHP Files
**Problem**: Some SHP files contain self-intersecting or invalid polygons
**Impact**: MEDIUM — PostGIS functions may fail, tiles may be empty
**Mitigation**:
- Run `ST_MakeValid()` on ALL imported geometries (migration T8 + import T12)
- QA scenario verifies all geometries pass `ST_IsValid(geom)`

---

### Issue 4: Martin ID Column Configuration
**Problem**: MapLibre feature-state requires numeric `id` field in tiles
**Impact**: HIGH — selection won't work without proper ID
**Mitigation**:
- Configure Martin with `id_columns: id` in function source
- Tile function must include `id` in SELECT
- QA scenario verifies tile contains `id` property

---

### Issue 5: Nginx Cache Invalidation on Import
**Problem**: New data imports don't automatically bust tile cache
**Impact**: MEDIUM — users see stale tiles after import
**Mitigation**:
- ShpUploader triggers cache invalidation after import
- Implementation: `docker exec nginx rm -rf /var/cache/nginx/tiles/*` OR cache key includes timestamp
- QA scenario verifies X-Cache-Status goes from HIT to MISS after import

---

### Issue 6: `ST_Simplify` vs `ST_SimplifyPreserveTopology`
**Problem**: `ST_Simplify` can break polygon topology (invalid geometries)
**Impact**: HIGH — tiles may be corrupted, map doesn't render
**Mitigation**:
- ALWAYS use `ST_SimplifyPreserveTopology` in tile function
- Guardrail explicitly forbids `ST_Simplify`
- Code review checks for this pattern

---

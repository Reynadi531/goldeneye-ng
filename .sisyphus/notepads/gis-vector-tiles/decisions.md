# Architectural Decisions — GIS Vector Tiles

> Key architectural and technical decisions made during planning and execution.

---

## [2026-03-18T07:20:07Z] Initial Planning Phase

### Decision 1: Vector Tiles Over Viewport-Based Loading
**Context**: User needs ALL 10K+ polygons visible at every zoom level
**Options**: 
1. Viewport-based loading with pagination
2. Clustering
3. Vector tiles with zoom-dependent simplification

**Choice**: Option 3 — Vector tiles

**Rationale**:
- User explicitly rejected viewport filtering ("overview is critical")
- Clustering rejected by user (needs all polygons visible)
- Vector tiles enable progressive loading without compromising visibility
- WebGL rendering handles 10K+ features efficiently

---

### Decision 2: Martin Over pg_tileserv
**Context**: Need tile server for PostGIS → MVT conversion
**Options**: 
1. Martin (Rust-based, function sources)
2. pg_tileserv (Go-based, table sources)

**Choice**: Martin

**Rationale**:
- Research shows Martin 6-7x faster than pg_tileserv
- Function source support enables zoom-dependent simplification
- `id_columns` configuration enables feature-state in MapLibre
- Active maintenance and better documentation

---

### Decision 3: Nginx File Cache Over Redis
**Context**: Tile caching strategy
**Options**: 
1. Redis cache with custom TTL logic
2. Nginx proxy_cache with file system storage

**Choice**: Nginx file cache

**Rationale**:
- Simpler infrastructure (one less service)
- Native HTTP cache headers support
- Built-in cache invalidation via cache key
- File system performance adequate for tile workload
- User data updates are rare (weekly or less)

---

### Decision 4: MapLibre GL JS Over Leaflet
**Context**: Frontend rendering library
**Options**: 
1. Continue with react-leaflet (DOM-based)
2. Migrate to MapLibre GL JS (WebGL-based)

**Choice**: MapLibre GL JS

**Rationale**:
- WebGL rendering handles 10K+ polygons efficiently (vs DOM bottleneck)
- Native vector tile support
- Feature-state API enables zero-React-render selection
- Industry standard for vector tile visualization

---

### Decision 5: 3-Tier Simplification Strategy
**Context**: Balance between detail and performance
**Tiers**:
- z0-7: Aggressive (tolerance × 10)
- z8-12: Moderate (tolerance × 3)
- z13+: Full resolution

**Rationale**:
- Low zoom: users need overview, aggressive simplification acceptable
- Mid zoom: balance detail and performance
- High zoom: users inspect details, no simplification
- Formula: `tolerance = 40075016.686 / (256 * POW(2, zoom))` (pixel-based)

---

### Decision 6: Coordinate Order Swap Strategy
**Context**: Current data stored as `[lat, lng]` (Leaflet), PostGIS/GeoJSON expects `[lng, lat]`
**Approach**: Swap during migration AND at import

**Critical Points**:
1. Migration script swaps existing JSONB → geometry
2. ShpUploader outputs `[lng, lat]` directly
3. Verification checks coordinate order explicitly

**Risk Mitigation**: Explicit QA scenarios for coordinate order in T8 and T12

---

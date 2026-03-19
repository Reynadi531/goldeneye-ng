-- Create PostGIS MVT tile generation function for mine features
-- Returns Mapbox Vector Tile (MVT) bytea with zoom-dependent simplification

CREATE OR REPLACE FUNCTION tile_mine_features(z integer, x integer, y integer)
RETURNS bytea AS $$
DECLARE
  tile_bounds geometry;
  tile_bounds_4326 geometry;
  tolerance double precision;
  simplification_factor integer;
BEGIN
  -- Calculate tile bounds using PostGIS ST_TileEnvelope (returns SRID 3857)
  tile_bounds := ST_TileEnvelope(z, x, y);
  -- Transform to 4326 for spatial query against source data
  tile_bounds_4326 := ST_Transform(tile_bounds, 4326);
  
  -- Calculate base tolerance using pixel-based formula
  -- Formula: Earth circumference / (tile size * 2^zoom)
  tolerance := 40075016.686 / (256 * POW(2, z));
  
  -- Determine simplification factor based on zoom level
  -- z0-7: Aggressive simplification (10x tolerance)
  -- z8-12: Moderate simplification (3x tolerance)
  -- z13+: No simplification (full detail)
  IF z <= 7 THEN
    simplification_factor := 10;
  ELSIF z <= 12 THEN
    simplification_factor := 3;
  ELSE
    simplification_factor := 0;
  END IF;
  
  -- Generate MVT bytea from query results
  RETURN (
    SELECT ST_AsMVT(tile, 'tile_mine_features', 4096, 'geom')
    FROM (
      SELECT
        id,
        name,
        layer_id AS "layerId",
        -- Transform geometry to 3857 for MVT, apply zoom-dependent simplification
        -- ST_SimplifyPreserveTopology NEVER breaks topology (unlike ST_Simplify)
        CASE 
          WHEN simplification_factor > 0 THEN
            ST_AsMVTGeom(
              ST_SimplifyPreserveTopology(ST_Transform(geom, 3857), tolerance * simplification_factor),
              tile_bounds,
              4096,  -- MVT extent (standard)
              256,   -- Buffer around tile (prevents clipping artifacts)
              true   -- Clip geometry to tile bounds
            )
          ELSE
            -- No simplification at high zoom - use full geometry
            ST_AsMVTGeom(ST_Transform(geom, 3857), tile_bounds, 4096, 256, true)
        END AS geom
      FROM mine_feature
      WHERE geom IS NOT NULL AND ST_Intersects(geom, tile_bounds_4326)
    ) AS tile
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE STRICT PARALLEL SAFE;

-- IMMUTABLE: function result depends only on inputs (enables query optimization)
-- STRICT: returns NULL if any parameter is NULL (no need to check inside function)
-- PARALLEL SAFE: can be executed in parallel workers (improves performance)

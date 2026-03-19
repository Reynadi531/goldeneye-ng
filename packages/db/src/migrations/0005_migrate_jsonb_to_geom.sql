DO $$
DECLARE
  batch_size INTEGER := 1000;
  total_rows INTEGER;
  processed INTEGER := 0;
  feature_record RECORD;
BEGIN
  SELECT COUNT(*) INTO total_rows FROM mine_feature WHERE coordinates IS NOT NULL AND geom IS NULL;
  RAISE NOTICE 'Migrating % features from JSONB to PostGIS geometry', total_rows;
  
  FOR feature_record IN 
    SELECT id, coordinates FROM mine_feature 
    WHERE coordinates IS NOT NULL AND geom IS NULL
  LOOP
    UPDATE mine_feature
    SET geom = ST_MakeValid(
      ST_GeomFromGeoJSON(
        jsonb_build_object(
          'type', 'MultiPolygon',
          'coordinates', (
            SELECT jsonb_agg(
              jsonb_build_array(
                (SELECT jsonb_agg(jsonb_build_array(coord->1, coord->0))
                 FROM jsonb_array_elements(ring) AS coord)
              )
            )
            FROM jsonb_array_elements(feature_record.coordinates) AS ring
          )
        )::text
      )
    )
    WHERE id = feature_record.id;
    
    processed := processed + 1;
    IF processed % batch_size = 0 THEN
      RAISE NOTICE 'Processed % / % features', processed, total_rows;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Migration complete. Processed % features', processed;
END $$;

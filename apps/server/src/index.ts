import { auth } from "@goldeneye-ng/auth";
import { db, eq, sql } from "@goldeneye-ng/db";
import { mineLayer, mineFeature } from "@goldeneye-ng/db/schema/mines";
import { env } from "@goldeneye-ng/env/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

const app = new Hono();

app.use(logger());
app.use(
  "/*",
  cors({
    origin: env.CORS_ORIGIN,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

app.get("/api/bounds", async (c) => {
  try {
    const result = await db.execute<{
      min_lng: number | null;
      min_lat: number | null;
      max_lng: number | null;
      max_lat: number | null;
    }>(sql`
      SELECT 
        ST_XMin(ST_Extent(geom)) as min_lng,
        ST_YMin(ST_Extent(geom)) as min_lat,
        ST_XMax(ST_Extent(geom)) as max_lng,
        ST_YMax(ST_Extent(geom)) as max_lat
      FROM mine_feature
      WHERE geom IS NOT NULL
    `);

    const row = result.rows[0];
    if (!row?.min_lng) {
      return c.json(null);
    }

    return c.json({
      minLng: row.min_lng,
      minLat: row.min_lat,
      maxLng: row.max_lng,
      maxLat: row.max_lat,
    });
  } catch (error) {
    console.error("Failed to fetch bounds:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/api/layers", async (c) => {
  try {
    const result = await db.execute<{
      id: string;
      name: string;
      description: string | null;
      imported_at: Date;
      imported_by: string;
      feature_count: string;
      point_count: string;
      polygon_count: string;
    }>(sql`
      SELECT 
        ml.id,
        ml.name,
        ml.description,
        ml.imported_at,
        ml.imported_by,
        COUNT(mf.id)::text AS feature_count,
        COUNT(mf.id) FILTER (WHERE mf.type = 'point')::text AS point_count,
        COUNT(mf.id) FILTER (WHERE mf.type = 'polygon')::text AS polygon_count
      FROM mine_layer ml
      LEFT JOIN mine_feature mf ON mf.layer_id = ml.id
      GROUP BY ml.id
      ORDER BY ml.imported_at
    `);

    const layers = result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      importedAt: row.imported_at,
      importedBy: row.imported_by,
      featureCount: parseInt(row.feature_count, 10),
      pointCount: parseInt(row.point_count, 10),
      polygonCount: parseInt(row.polygon_count, 10),
    }));

    return c.json(layers);
  } catch (error) {
    console.error("Failed to fetch layers:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/api/layers", async (c) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") return c.json({ error: "Forbidden" }, 403);

    let body: {
      name: string;
      description?: string;
      features: {
        id: string;
        name: string;
        type: "point" | "polygon";
        lat: number;
        lng: number;
        geojsonGeometry?: { type: string; coordinates: unknown } | null;
        properties: Record<string, unknown>;
      }[];
    };

    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    if (!body.name?.trim()) {
      return c.json({ error: "Layer name is required" }, 400);
    }
    if (!Array.isArray(body.features) || body.features.length === 0) {
      return c.json({ error: "No features provided" }, 400);
    }

    const layerId = crypto.randomUUID();
    const userId = session.user.id;

    await db.transaction(async (tx) => {
      await tx.insert(mineLayer).values({
        id: layerId,
        name: body.name.trim(),
        description: body.description?.trim() ?? null,
        importedBy: userId,
      });

      const withGeometry = body.features.filter((f) => f.geojsonGeometry);
      const withoutGeometry = body.features.filter((f) => !f.geojsonGeometry);

      if (withoutGeometry.length > 0) {
        await tx.insert(mineFeature).values(
          withoutGeometry.map((f) => ({
            id: f.id,
            layerId,
            name: f.name,
            type: f.type,
            lat: f.lat,
            lng: f.lng,
            properties: f.properties,
            importedBy: userId,
          })),
        ).onConflictDoNothing();
      }

      if (withGeometry.length > 0) {
        const values = withGeometry
          .map((f, i) => `
            (${i}, ${layerId}, ${f.name}, ${f.type}, ${f.lat}, ${f.lng},
             ST_MakeValid(ST_GeomFromGeoJSON(${JSON.stringify(f.geojsonGeometry)}),
             ${JSON.stringify(f.properties)}::jsonb, ${userId})`)
          .join(", ");

        await tx.execute(sql`
          INSERT INTO mine_feature (id, layer_id, name, type, lat, lng, geom, properties, imported_by)
          VALUES ${sql.raw(values)}
          ON CONFLICT (id) DO NOTHING
        `);
      }
    });

    return c.json({ layerId, inserted: body.features.length });
  } catch (error) {
    console.error("Failed to create layer:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/api/features/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const result = await db
      .select({
        id: mineFeature.id,
        layerId: mineFeature.layerId,
        name: mineFeature.name,
        type: mineFeature.type,
        properties: mineFeature.properties,
      })
      .from(mineFeature)
      .where(eq(mineFeature.id, id))
      .limit(1);

    if (result.length === 0) {
      return c.json({ error: "Feature not found" }, 404);
    }

    return c.json(result[0]);
  } catch (error) {
    console.error("Failed to fetch feature:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.delete("/api/layers/:id", async (c) => {
  try {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) return c.json({ error: "Unauthorized" }, 401);
    const role = (session.user as { role?: string }).role;
    if (role !== "admin") return c.json({ error: "Forbidden" }, 403);

    const id = c.req.param("id");
    await db.delete(mineLayer).where(eq(mineLayer.id, id));

    return c.json({ deleted: id });
  } catch (error) {
    console.error("Failed to delete layer:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;

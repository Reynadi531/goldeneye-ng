import { auth } from "@goldeneye-ng/auth";
import { db, eq } from "@goldeneye-ng/db";
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

// --- Layer routes ---

// GET /api/layers — list all layers with their features nested
app.get("/api/layers", async (c) => {
  const layers = await db.select().from(mineLayer).orderBy(mineLayer.importedAt);
  const features = await db.select().from(mineFeature).orderBy(mineFeature.importedAt);

  const result = layers.map((layer) => ({
    ...layer,
    features: features.filter((f) => f.layerId === layer.id),
  }));

  return c.json(result);
});

// POST /api/layers — create a new layer and bulk-insert its features
// Body: { name: string; description?: string; features: Array<{ id, name, type, lat, lng, coordinates?, properties }> }
// Requires authenticated admin session
app.post("/api/layers", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const body = await c.req.json<{
    name: string;
    description?: string;
    features: {
      id: string;
      name: string;
      type: "point" | "polygon";
      lat: number;
      lng: number;
      coordinates?: [number, number][][];
      properties: Record<string, unknown>;
    }[];
  }>();

  if (!body.name?.trim()) {
    return c.json({ error: "Layer name is required" }, 400);
  }
  if (!Array.isArray(body.features) || body.features.length === 0) {
    return c.json({ error: "No features provided" }, 400);
  }

  const layerId = crypto.randomUUID();

  await db.insert(mineLayer).values({
    id: layerId,
    name: body.name.trim(),
    description: body.description?.trim() ?? null,
    importedBy: session.user.id,
  });

  const featureRows = body.features.map((f) => ({
    id: f.id,
    layerId,
    name: f.name,
    type: f.type,
    lat: f.lat,
    lng: f.lng,
    coordinates: f.coordinates ?? null,
    properties: f.properties,
    importedBy: session.user.id,
  }));

  await db.insert(mineFeature).values(featureRows).onConflictDoNothing();

  return c.json({ layerId, inserted: featureRows.length });
});

// DELETE /api/layers/:id — delete a layer and all its features (cascade)
app.delete("/api/layers/:id", async (c) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Unauthorized" }, 401);
  const role = (session.user as { role?: string }).role;
  if (role !== "admin") return c.json({ error: "Forbidden" }, 403);

  const id = c.req.param("id");
  await db.delete(mineLayer).where(eq(mineLayer.id, id));
  return c.json({ deleted: id });
});

app.get("/", (c) => {
  return c.text("OK");
});

export default app;

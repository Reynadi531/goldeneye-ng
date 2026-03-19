import { pgTable, text, timestamp, doublePrecision, jsonb, index, customType } from "drizzle-orm/pg-core";

const geometry = customType<{ data: unknown }>({
  dataType() {
    return "geometry(MultiPolygon,4326)";
  },
});

export const mineLayer = pgTable("mine_layer", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  importedAt: timestamp("imported_at").defaultNow().notNull(),
  importedBy: text("imported_by").notNull(),
});

export const mineFeature = pgTable(
  "mine_feature",
  {
    id: text("id").primaryKey(),
    layerId: text("layer_id")
      .notNull()
      .references(() => mineLayer.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type", { enum: ["point", "polygon"] }).notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    geom: geometry("geom"),
    properties: jsonb("properties").notNull().default({}),
    importedAt: timestamp("imported_at").defaultNow().notNull(),
    importedBy: text("imported_by").notNull(),
  },
  (table) => [
    index("mine_feature_type_idx").on(table.type),
    index("mine_feature_layer_idx").on(table.layerId),
    index("mine_feature_geom_idx").on(table.geom),
  ],
);

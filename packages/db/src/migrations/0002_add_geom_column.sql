CREATE TABLE "mine_layer" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"imported_by" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mine_feature" (
	"id" text PRIMARY KEY NOT NULL,
	"layer_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"coordinates" jsonb,
	"geom" geometry(Geometry,4326),
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"imported_at" timestamp DEFAULT now() NOT NULL,
	"imported_by" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "mine_feature" ADD CONSTRAINT "mine_feature_layer_id_mine_layer_id_fk" FOREIGN KEY ("layer_id") REFERENCES "public"."mine_layer"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "mine_feature_type_idx" ON "mine_feature" USING btree ("type");
--> statement-breakpoint
CREATE INDEX "mine_feature_layer_idx" ON "mine_feature" USING btree ("layer_id");
--> statement-breakpoint
CREATE INDEX "mine_feature_geom_idx" ON "mine_feature" USING gist ("geom");

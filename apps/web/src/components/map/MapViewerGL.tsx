import { useState, useEffect, useRef, useMemo } from "react";
import Map, { Source, Layer } from "react-map-gl/maplibre";
import type { MapRef } from "react-map-gl/maplibre";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { env } from "@goldeneye-ng/env/web";
import type { Bounds } from "@/lib/api";

interface MapViewerGLProps {
  layers: Array<{
    id: string;
    color: string;
    opacity: number;
    visible: boolean;
  }>;
  bounds?: Bounds | null;
  onFeatureClick?: (feature: { id: string; name: string; layerId: string }) => void;
}

const satelliteUrl = "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}";
const streetUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

const createMapStyle = (baseMap: "satellite" | "street"): maplibregl.StyleSpecification => ({
  version: 8,
  sources: {
    basemap: {
      type: "raster",
      tiles: [baseMap === "satellite" ? satelliteUrl : streetUrl],
      tileSize: 256,
      attribution: baseMap === "satellite" 
        ? "© Google" 
        : "© OpenStreetMap contributors",
    },
  },
  layers: [
    { id: "basemap", type: "raster", source: "basemap" },
  ],
});

export default function MapViewerGL({ layers, bounds, onFeatureClick }: MapViewerGLProps) {
  const [baseMap, setBaseMap] = useState<"satellite" | "street">("satellite");
  const mapRef = useRef<MapRef>(null);
  const hoveredId = useRef<string | number | null>(null);
  const selectedId = useRef<string | number | null>(null);
  const [cursor, setCursor] = useState<"pointer" | "grab">("grab");
  const hasFittedBounds = useRef(false);

  const mapStyle = useMemo(() => createMapStyle(baseMap), [baseMap]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !bounds || hasFittedBounds.current) return;

    const fitBounds = () => {
      map.fitBounds(
        [[bounds.minLng, bounds.minLat], [bounds.maxLng, bounds.maxLat]],
        { padding: 50, maxZoom: 14 }
      );
      hasFittedBounds.current = true;
    };

    if (map.loaded()) {
      fitBounds();
    } else {
      map.once("load", fitBounds);
    }
  }, [bounds]);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const updateFeatureState = () => {
      if (!map.getSource("mine-features") || !map.isSourceLoaded("mine-features")) return;
      
      const features = map.querySourceFeatures("mine-features", { sourceLayer: "tile_mine_features" });
      features.forEach((feature) => {
        const layerId = feature.properties?.layerId;
        const layer = layers.find((l) => l.id === layerId);
        if (layer && feature.id !== undefined) {
          map.setFeatureState(
            { source: "mine-features", sourceLayer: "tile_mine_features", id: feature.id },
            { color: layer.color, opacity: layer.opacity }
          );
        }
      });
    };

    const handleSourceData = (e: any) => {
      if (e.sourceId === "mine-features" && e.isSourceLoaded) {
        updateFeatureState();
      }
    };

    map.on("sourcedata", handleSourceData);
    updateFeatureState();

    return () => {
      map.off("sourcedata", handleSourceData);
    };
  }, [layers]);

  const visibleLayerIds = layers.filter((l) => l.visible).map((l) => l.id);
  const baseFilter = visibleLayerIds.length > 0 
    ? ["in", ["get", "layerId"], ["literal", visibleLayerIds]]
    : ["==", ["get", "layerId"], "NONE"];
  const pointFilter = ["all", ["==", ["geometry-type"], "Point"], baseFilter];
  const polygonFilter = ["all", ["!=", ["geometry-type"], "Point"], baseFilter];

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: 102.5,
          latitude: -1.5,
          zoom: 8,
        }}
        mapStyle={mapStyle}
        interactiveLayerIds={["polygons-fill", "points-circle"]}
        cursor={cursor}
        onClick={(e) => {
          const map = mapRef.current?.getMap();
          if (!map) return;
          
          if (selectedId.current !== null) {
            map.setFeatureState(
              { source: "mine-features", sourceLayer: "tile_mine_features", id: selectedId.current },
              { selected: false }
            );
          }
          
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            if (feature.id !== undefined) {
              selectedId.current = feature.id;
              map.setFeatureState(
                { source: "mine-features", sourceLayer: "tile_mine_features", id: feature.id },
                { selected: true }
              );
            }
            onFeatureClick?.({
              id: feature.id as string,
              name: feature.properties?.name || "Unknown",
              layerId: feature.properties?.layerId || "unknown",
            });
          } else {
            selectedId.current = null;
          }
        }}
        onMouseMove={(e) => {
          const map = mapRef.current?.getMap();
          if (!map) return;
          
          if (hoveredId.current !== null) {
            map.setFeatureState(
              { source: "mine-features", sourceLayer: "tile_mine_features", id: hoveredId.current },
              { hover: false }
            );
          }
          
          if (e.features && e.features.length > 0) {
            const feature = e.features[0];
            if (feature.id !== undefined) {
              hoveredId.current = feature.id;
              map.setFeatureState(
                { source: "mine-features", sourceLayer: "tile_mine_features", id: feature.id },
                { hover: true }
              );
            }
            setCursor("pointer");
          } else {
            hoveredId.current = null;
            setCursor("grab");
          }
        }}
        onMouseLeave={() => {
          const map = mapRef.current?.getMap();
          if (!map || hoveredId.current === null) return;
          map.setFeatureState(
            { source: "mine-features", sourceLayer: "tile_mine_features", id: hoveredId.current },
            { hover: false }
          );
          hoveredId.current = null;
          setCursor("grab");
        }}
      >

        <Source
          id="mine-features"
          type="vector"
          tiles={[`${env.VITE_MARTIN_URL}/tile_mine_features/{z}/{x}/{y}`]}
          promoteId="id"
        >
          <Layer
            id="polygons-fill"
            type="fill"
            source="mine-features"
            source-layer="tile_mine_features"
            filter={polygonFilter as maplibregl.FilterSpecification}
            paint={{
              "fill-color": [
                "case",
                ["boolean", ["feature-state", "selected"], false], "#fbbf24",
                ["boolean", ["feature-state", "hover"], false], "#60a5fa",
                ["coalesce", ["feature-state", "color"], "#ef4444"],
              ],
              "fill-opacity": [
                "case",
                ["boolean", ["feature-state", "selected"], false], 0.8,
                ["boolean", ["feature-state", "hover"], false], 0.7,
                ["coalesce", ["feature-state", "opacity"], 0.5],
              ],
            }}
          />
          <Layer
            id="polygons-outline"
            type="line"
            source="mine-features"
            source-layer="tile_mine_features"
            filter={polygonFilter as maplibregl.FilterSpecification}
            paint={{
              "line-color": [
                "case",
                ["boolean", ["feature-state", "selected"], false], "#fbbf24",
                ["boolean", ["feature-state", "hover"], false], "#60a5fa",
                ["coalesce", ["feature-state", "color"], "#ef4444"],
              ],
              "line-width": [
                "case",
                ["boolean", ["feature-state", "selected"], false], 3,
                ["boolean", ["feature-state", "hover"], false], 2.5,
                2,
              ],
              "line-opacity": [
                "case",
                ["boolean", ["feature-state", "selected"], false], 1,
                ["boolean", ["feature-state", "hover"], false], 0.9,
                0.8,
              ],
            }}
          />
          <Layer
            id="points-circle"
            type="circle"
            source="mine-features"
            source-layer="tile_mine_features"
            filter={pointFilter as maplibregl.FilterSpecification}
            paint={{
              "circle-radius": [
                "interpolate", ["linear"], ["zoom"],
                4, 6,
                8, 10,
                12, 14,
                16, 18
              ],
              "circle-color": [
                "case",
                ["boolean", ["feature-state", "selected"], false], "#fbbf24",
                ["boolean", ["feature-state", "hover"], false], "#60a5fa",
                ["coalesce", ["feature-state", "color"], "#22c55e"],
              ],
              "circle-opacity": [
                "case",
                ["boolean", ["feature-state", "selected"], false], 1,
                ["boolean", ["feature-state", "hover"], false], 0.9,
                ["coalesce", ["feature-state", "opacity"], 1],
              ],
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-opacity": 1,
            }}
          />
        </Source>
      </Map>

      <div className="absolute top-4 right-4 z-[1000] bg-background/95 backdrop-blur border rounded-lg shadow-lg p-2 flex flex-col gap-2">
        <label className="text-xs font-medium px-2 py-1">Basemap</label>
        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 cursor-pointer px-2">
            <input
              type="radio"
              name="basemap"
              checked={baseMap === "satellite"}
              onChange={() => setBaseMap("satellite")}
              className="accent-primary"
            />
            <span className="text-xs">Satellite</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer px-2">
            <input
              type="radio"
              name="basemap"
              checked={baseMap === "street"}
              onChange={() => setBaseMap("street")}
              className="accent-primary"
            />
            <span className="text-xs">Street</span>
          </label>
        </div>
      </div>

      <div className="absolute bottom-4 left-4 z-[1000] bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-xs">Illegal Gold Mine</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 border-2 border-red-500 bg-red-200/50"></div>
          <span className="text-xs">Mining Area</span>
        </div>
      </div>
    </div>
  );
}

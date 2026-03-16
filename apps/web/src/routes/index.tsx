import { useState, useCallback, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Layers, MapPin, Pentagon } from "lucide-react";
import MapViewer from "@/components/map/MapViewer";
import LayerPanel, { type LayerGroup } from "@/components/map/LayerPanel";
import { getLayers, type LayerWithFeatures } from "@/lib/api";
import type { LatLngExpression } from "leaflet";

// Palette for auto-assigning distinct colors to layers on load
const LAYER_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#22c55e",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#eab308",
  "#ec4899",
];

interface MineFeature {
  id: string;
  layerId: string;
  name: string;
  type: "point" | "polygon";
  location: LatLngExpression;
  coordinates?: LatLngExpression[][];
  properties: Record<string, unknown>;
}

interface LayerStyle {
  color: string;
  opacity: number;
}

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [layers, setLayers] = useState<LayerWithFeatures[]>([]);
  const [visibleLayerIds, setVisibleLayerIds] = useState<Set<string>>(new Set());
  const [layerStyles, setLayerStyles] = useState<Record<string, LayerStyle>>({});
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [isLoadingLayers, setIsLoadingLayers] = useState(true);

  useEffect(() => {
    setIsLoadingLayers(true);
    getLayers()
      .then((data) => {
        setLayers(data);
        setVisibleLayerIds(new Set(data.map((l) => l.id)));
        // Assign a distinct color to each layer
        const styles: Record<string, LayerStyle> = {};
        data.forEach((l, i) => {
          styles[l.id] = {
            color: LAYER_COLORS[i % LAYER_COLORS.length],
            opacity: 0.5,
          };
        });
        setLayerStyles(styles);
      })
      .catch(console.error)
      .finally(() => setIsLoadingLayers(false));
  }, []);

  const toggleLayerVisibility = useCallback((id: string) => {
    setVisibleLayerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllLayers = useCallback(
    (visible: boolean) => {
      setVisibleLayerIds(visible ? new Set(layers.map((l) => l.id)) : new Set());
    },
    [layers],
  );

  const handleColorChange = useCallback((id: string, color: string) => {
    setLayerStyles((prev) => ({
      ...prev,
      [id]: { ...prev[id], color },
    }));
  }, []);

  const handleOpacityChange = useCallback((id: string, opacity: number) => {
    setLayerStyles((prev) => ({
      ...prev,
      [id]: { ...prev[id], opacity },
    }));
  }, []);

  // Flatten visible features for MapViewer, attaching per-layer style
  const visibleMines = layers
    .filter((l) => visibleLayerIds.has(l.id))
    .flatMap((l) => {
      const style = layerStyles[l.id] ?? { color: "#ef4444", opacity: 0.5 };
      return l.features.map((f) => ({
        id: f.id,
        layerId: l.id,
        name: f.name,
        type: f.type,
        location: [f.lat, f.lng] as LatLngExpression,
        coordinates: f.coordinates ? (f.coordinates as LatLngExpression[][]) : undefined,
        properties: f.properties,
        color: style.color,
        opacity: style.opacity,
      }));
    });

  const allFeatures = layers.flatMap((l) => l.features);

  const layerGroups: LayerGroup[] = layers.map((l) => {
    const style = layerStyles[l.id] ?? { color: "#ef4444", opacity: 0.5 };
    return {
      id: l.id,
      name: l.name,
      featureCount: l.features.length,
      pointCount: l.features.filter((f) => f.type === "point").length,
      polygonCount: l.features.filter((f) => f.type === "polygon").length,
      visible: visibleLayerIds.has(l.id),
      color: style.color,
      opacity: style.opacity,
    };
  });

  const visibleFeatures = visibleMines;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <MapViewer mines={visibleMines} />

      {showLayerPanel && (isLoadingLayers || layerGroups.length > 0) && (
        <div className="absolute top-4 left-4 z-[1000]">
          <LayerPanel
            layers={layerGroups}
            isLoading={isLoadingLayers}
            onToggleLayer={toggleLayerVisibility}
            onToggleAll={toggleAllLayers}
            onColorChange={handleColorChange}
            onOpacityChange={handleOpacityChange}
          />
        </div>
      )}

      {(isLoadingLayers || layerGroups.length > 0) && (
        <div className="absolute top-4 right-4 z-[1000]">
          <button
            onClick={() => setShowLayerPanel(!showLayerPanel)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-background/95 backdrop-blur border rounded-lg shadow-lg hover:bg-muted/50 transition-colors"
          >
            <Layers className="w-4 h-4" />
            Layers
          </button>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-[1000] bg-background/95 backdrop-blur border rounded-lg shadow-lg p-3">
        <div className="text-xs space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="w-3 h-3 text-red-500" />
            <span>
              Points: {visibleFeatures.filter((f) => f.type === "point").length}/
              {allFeatures.filter((f) => f.type === "point").length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Pentagon className="w-3 h-3 text-red-500" />
            <span>
              Polygons: {visibleFeatures.filter((f) => f.type === "polygon").length}/
              {allFeatures.filter((f) => f.type === "polygon").length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

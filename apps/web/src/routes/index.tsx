import { useState, useCallback, useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Layers, MapPin, Pentagon } from "lucide-react";
import MapViewerGL from "@/components/map/MapViewerGL";
import LayerPanel, { type LayerGroup } from "@/components/map/LayerPanel";
import { getLayers, getBounds, type LayerRow, type Bounds } from "@/lib/api";
import { toast } from "sonner";

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

interface LayerStyle {
  color: string;
  opacity: number;
}

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [layers, setLayers] = useState<LayerRow[]>([]);
  const [bounds, setBounds] = useState<Bounds | null>(null);
  const [visibleLayerIds, setVisibleLayerIds] = useState<Set<string>>(new Set());
  const [layerStyles, setLayerStyles] = useState<Record<string, LayerStyle>>({});
  const [showLayerPanel, setShowLayerPanel] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadLayers = useCallback(() => {
    setIsLoading(true);
    setLoadError(null);
    Promise.all([getLayers(), getBounds()])
      .then(([layerData, boundsData]) => {
        setLayers(layerData);
        setBounds(boundsData);
        setVisibleLayerIds(new Set());
        const styles: Record<string, LayerStyle> = {};
        layerData.forEach((l, i) => {
          styles[l.id] = {
            color: LAYER_COLORS[i % LAYER_COLORS.length],
            opacity: 0.5,
          };
        });
        setLayerStyles(styles);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Failed to load layers"))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    loadLayers();
  }, [loadLayers]);

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

  const mapLayers = layers.map((l) => ({
    id: l.id,
    color: layerStyles[l.id]?.color ?? "#ef4444",
    opacity: layerStyles[l.id]?.opacity ?? 0.5,
    visible: visibleLayerIds.has(l.id),
  }));

  const totalPoints = layers.reduce((sum, l) => sum + l.pointCount, 0);
  const totalPolygons = layers.reduce((sum, l) => sum + l.polygonCount, 0);
  const visiblePoints = layers
    .filter(l => visibleLayerIds.has(l.id))
    .reduce((sum, l) => sum + l.pointCount, 0);
  const visiblePolygons = layers
    .filter(l => visibleLayerIds.has(l.id))
    .reduce((sum, l) => sum + l.polygonCount, 0);

  const layerGroups: LayerGroup[] = layers.map((l) => {
    const style = layerStyles[l.id] ?? { color: "#ef4444", opacity: 0.5 };
    return {
      id: l.id,
      name: l.name,
      featureCount: l.featureCount,
      pointCount: l.pointCount,
      polygonCount: l.polygonCount,
      visible: visibleLayerIds.has(l.id),
      color: style.color,
      opacity: style.opacity,
    };
  });

  return (
    <div className="relative w-full h-full overflow-hidden isolate">
      {isLoading && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading layers...</span>
          </div>
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 z-[2000] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <span className="text-sm text-destructive">{loadError}</span>
            <button
              onClick={loadLayers}
              className="text-sm underline hover:text-foreground/80"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      <MapViewerGL 
        layers={mapLayers}
        bounds={bounds}
        onFeatureClick={() => {}}
      />

      {showLayerPanel && layerGroups.length > 0 && (
        <div className="absolute top-4 left-4 z-[1000]">
          <LayerPanel
            layers={layerGroups}
            onToggleLayer={toggleLayerVisibility}
            onToggleAll={toggleAllLayers}
            onColorChange={handleColorChange}
            onOpacityChange={handleOpacityChange}
          />
        </div>
      )}

      {layerGroups.length > 0 && (
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
              Points: {visiblePoints}/{totalPoints}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Pentagon className="w-3 h-3 text-red-500" />
            <span>
              Polygons: {visiblePolygons}/{totalPolygons}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

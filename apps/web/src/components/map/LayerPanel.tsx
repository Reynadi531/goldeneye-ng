import { useState, useRef } from "react";
import {
  Layers,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Pentagon,
  Palette,
} from "lucide-react";
import { Checkbox } from "@goldeneye-ng/ui/components/checkbox";

export interface LayerGroup {
  id: string;
  name: string;
  featureCount: number;
  pointCount: number;
  polygonCount: number;
  visible: boolean;
  color: string;
  opacity: number;
}

interface LayerPanelProps {
  layers: LayerGroup[];
  onToggleLayer: (id: string) => void;
  onToggleAll?: (visible: boolean) => void;
  onColorChange: (id: string, color: string) => void;
  onOpacityChange: (id: string, opacity: number) => void;
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#ffffff", // white
];

function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="px-2 pb-2 pt-1">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1.5 font-medium">
        Color
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="w-5 h-5 rounded-sm border transition-transform hover:scale-110 focus:outline-none focus:ring-1 focus:ring-primary"
            style={{
              backgroundColor: c,
              borderColor: color === c ? "white" : "transparent",
              boxShadow: color === c ? `0 0 0 2px ${c}` : undefined,
            }}
            title={c}
          />
        ))}
        {/* Custom color swatch — opens native color picker */}
        <button
          onClick={() => inputRef.current?.click()}
          className="w-5 h-5 rounded-sm border border-dashed border-muted-foreground/50 flex items-center justify-center hover:border-foreground transition-colors"
          title="Custom color"
        >
          <Palette className="w-2.5 h-2.5 text-muted-foreground" />
        </button>
        <input
          ref={inputRef}
          type="color"
          value={color}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>
    </div>
  );
}

function OpacitySlider({
  opacity,
  color,
  onChange,
}: {
  opacity: number;
  color: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="px-2 pb-2.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
          Opacity
        </p>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {Math.round(opacity * 100)}%
        </span>
      </div>
      {/* Checkerboard track + color overlay */}
      <div
        className="relative h-3 rounded-full overflow-hidden"
        style={{
          background: `linear-gradient(to right, transparent, ${color}),
            repeating-conic-gradient(#888 0% 25%, #ccc 0% 50%) 0 0 / 8px 8px`,
        }}
      >
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={opacity}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"
        />
        {/* Thumb indicator */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow pointer-events-none"
          style={{
            left: `calc(${opacity * 100}% - ${opacity * 14}px)`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

export default function LayerPanel({
  layers,
  onToggleLayer,
  onToggleAll,
  onColorChange,
  onOpacityChange,
}: LayerPanelProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [styleOpen, setStyleOpen] = useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(true);
  const allVisible = layers.length > 0 && layers.every((l) => l.visible);

  const toggleCollapsed = (id: string) => setCollapsed((prev) => ({ ...prev, [id]: !prev[id] }));

  const toggleStyleOpen = (id: string) => setStyleOpen((prev) => ({ ...prev, [id]: !prev[id] }));

  if (!isExpanded) {
    return (
      <div className="absolute top-4 left-4 z-[1000]">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm bg-background/95 backdrop-blur border rounded-lg shadow-lg hover:bg-muted/50 transition-colors"
          title="Show layers"
        >
          <Layers className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-background/95 backdrop-blur border rounded-lg shadow-lg w-64 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1.5 rounded hover:bg-muted/50 transition-colors"
          title="Collapse"
        >
          <ChevronLeft className="w-3 h-3" />
        </button>
        <Layers className="w-4 h-4" />
        <span className="text-sm font-medium">Layers</span>
        <span className="ml-1 text-xs text-muted-foreground">({layers.length})</span>
        {onToggleAll && layers.length > 0 && (
          <button
            onClick={() => onToggleAll(!allVisible)}
            className="ml-auto p-1.5 rounded hover:bg-muted/50 transition-colors"
            title={allVisible ? "Hide all" : "Show all"}
          >
            {allVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          </button>
        )}
      </div>

      <div className="p-1 max-h-[32rem] overflow-y-auto">
        {layers.length === 0 && (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">
            No layers loaded. Import SHP files to add data.
          </p>
        )}

        {layers.map((layer) => {
          const isCollapsed = collapsed[layer.id];
          const isStyleOpen = styleOpen[layer.id];

          return (
            <div key={layer.id} className="mb-0.5">
              {/* Group header row */}
              <div className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-muted/50 transition-colors group">
                {/* Collapse toggle */}
                <button
                  className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  onClick={() => toggleCollapsed(layer.id)}
                  aria-label={isCollapsed ? "Expand" : "Collapse"}
                >
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>

                {/* Visibility checkbox */}
                <Checkbox
                  checked={layer.visible}
                  onCheckedChange={() => onToggleLayer(layer.id)}
                  className="h-3.5 w-3.5 shrink-0"
                />

                {/* Color swatch (click to open style panel) */}
                <button
                  onClick={() => toggleStyleOpen(layer.id)}
                  className="shrink-0 w-3.5 h-3.5 rounded-sm border border-white/20 shadow-sm transition-transform hover:scale-110"
                  style={{ backgroundColor: layer.color }}
                  title="Edit style"
                />

                {/* Layer name */}
                <span
                  className="text-sm flex-1 truncate cursor-pointer select-none"
                  onClick={() => toggleCollapsed(layer.id)}
                >
                  {layer.name}
                </span>

                {/* Feature count */}
                <span className="text-xs text-muted-foreground shrink-0">{layer.featureCount}</span>
              </div>

              {/* Style panel (color + opacity) */}
              {isStyleOpen && (
                <div className="mx-1 mb-1 rounded border bg-muted/30 overflow-hidden">
                  <ColorPicker color={layer.color} onChange={(c) => onColorChange(layer.id, c)} />
                  <OpacitySlider
                    opacity={layer.opacity}
                    color={layer.color}
                    onChange={(v) => onOpacityChange(layer.id, v)}
                  />
                </div>
              )}

              {/* Expanded feature-type summary */}
              {!isCollapsed && (
                <div className="pl-8 pb-1 flex items-center gap-3 text-xs text-muted-foreground">
                  {layer.pointCount > 0 && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" style={{ color: layer.color }} />
                      {layer.pointCount}
                    </span>
                  )}
                  {layer.polygonCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Pentagon className="w-3 h-3" style={{ color: layer.color }} />
                      {layer.polygonCount}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

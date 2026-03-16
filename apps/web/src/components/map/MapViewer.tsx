import { useState, useEffect, Fragment } from "react";
import { MapContainer, TileLayer, CircleMarker, Polygon, Popup, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface MineData {
  id: string;
  name: string;
  location: LatLngExpression;
  type: "point" | "polygon";
  coordinates?: LatLngExpression[][];
  description?: string;
  status?: string;
  detectedDate?: string;
  color?: string;
  opacity?: number;
}

interface MapViewerProps {
  mines: MineData[];
  onMineClick?: (mine: MineData) => void;
}

const satelliteUrl =
  "http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}";
const streetUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// Fits the map viewport to all feature bounds whenever the mines list changes.
function BoundsController({ mines }: { mines: MineData[] }) {
  const map = useMap();

  useEffect(() => {
    if (mines.length === 0) return;

    const latLngs: L.LatLng[] = [];

    for (const mine of mines) {
      if (mine.type === "point") {
        latLngs.push(L.latLng(mine.location as [number, number]));
      } else if (mine.coordinates && mine.coordinates.length > 0) {
        // coordinates is LatLngExpression[][] — iterate rings, then points
        for (const ring of mine.coordinates) {
          for (const c of ring) {
            latLngs.push(L.latLng(c as [number, number]));
          }
        }
      }
    }

    if (latLngs.length === 0) return;

    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [mines, map]);

  return null;
}

export default function MapViewer({ mines, onMineClick }: MapViewerProps) {
  const [baseMap, setBaseMap] = useState<"satellite" | "street">("satellite");

  return (
    <div className="relative w-full h-full">
      <MapContainer center={[-3.4653, -62.2159]} zoom={6} className="w-full h-full" zoomControl={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
          url={baseMap === "satellite" ? satelliteUrl : streetUrl}
        />

        <BoundsController mines={mines} />

        {mines.map((mine) => {
          const color = mine.color ?? "#ef4444";
          const opacity = mine.opacity ?? 0.5;

          return (
            <Fragment key={mine.id}>
              {mine.type === "point" ? (
                <CircleMarker
                  center={mine.location}
                  radius={6}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: opacity,
                    opacity: Math.min(opacity + 0.3, 1),
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => onMineClick?.(mine),
                  }}
                >
                  <Popup>
                    <div className="p-1">
                      <h3 className="font-semibold text-sm">{mine.name}</h3>
                      {mine.description && <p className="text-xs mt-1">{mine.description}</p>}
                      {mine.status && (
                        <p className="text-xs mt-1">
                          Status: <span className="font-medium">{mine.status}</span>
                        </p>
                      )}
                      {mine.detectedDate && (
                        <p className="text-xs text-muted-foreground">Detected: {mine.detectedDate}</p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              ) : mine.coordinates ? (
                <Polygon
                  positions={mine.coordinates}
                  pathOptions={{
                    color: color,
                    fillColor: color,
                    fillOpacity: opacity,
                    opacity: Math.min(opacity + 0.3, 1),
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => onMineClick?.(mine),
                  }}
                >
                  <Popup>
                    <div className="p-1">
                      <h3 className="font-semibold text-sm">{mine.name}</h3>
                      {mine.description && <p className="text-xs mt-1">{mine.description}</p>}
                    </div>
                  </Popup>
                </Polygon>
              ) : null}
            </Fragment>
          );
        })}
      </MapContainer>

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

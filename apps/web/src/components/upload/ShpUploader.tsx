import { useState, useCallback } from "react";
import { combine, parseShp, parseDbf as _parseDbf } from "shpjs";
import { Upload, FileWarning, CheckCircle, AlertCircle, X } from "lucide-react";
import { Button } from "@goldeneye-ng/ui/components/button";
import { Input } from "@goldeneye-ng/ui/components/input";
import { Label } from "@goldeneye-ng/ui/components/label";
import { toast } from "sonner";
import { saveLayer, type MineFeatureInput, type LayerWithFeatures } from "@/lib/api";

// shpjs v6 types ship with an outdated declaration requiring cpg as mandatory.
// At runtime cpg is optional — cast to work around the stale @types/shpjs package.
const parseDbf = _parseDbf as (dbf: ArrayBuffer, cpg?: ArrayBuffer) => GeoJSON.GeoJsonProperties[];

interface ShpUploaderProps {
  onDataLoaded: (layer: LayerWithFeatures) => void;
  onClose?: () => void;
}

export default function ShpUploader({ onDataLoaded, onClose }: ShpUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [layerName, setLayerName] = useState("");
  const [files, setFiles] = useState<
    { name: string; size: number; status: "pending" | "success" | "error" }[]
  >([]);

  const processFiles = async (uploadedFiles: FileList | File[]) => {
    if (!layerName.trim()) {
      toast.error("Please enter a layer name before uploading.");
      return;
    }

    const fileArray = Array.from(uploadedFiles);
    setFiles(fileArray.map((f) => ({ name: f.name, size: f.size, status: "pending" })));
    setIsProcessing(true);

    try {
      const shpFile = fileArray.find((f) => f.name.endsWith(".shp"));
      const dbfFile = fileArray.find((f) => f.name.endsWith(".dbf"));

      if (!shpFile) {
        toast.error("No .shp file found in the upload");
        setFiles((prev) => prev.map((f) => ({ ...f, status: "error" as const })));
        return;
      }

      const shpBuffer = await shpFile.arrayBuffer();
      const prjFile = fileArray.find((f) => f.name.endsWith(".prj"));
      const prjText = prjFile ? await prjFile.text() : undefined;
      let geojson: GeoJSON.FeatureCollection;

      if (dbfFile) {
        const dbfBuffer = await dbfFile.arrayBuffer();
        const shpFeatures = parseShp(shpBuffer, prjText);
        const dbfRows = parseDbf(dbfBuffer);
        geojson = combine([shpFeatures, dbfRows]) as GeoJSON.FeatureCollection;
      } else {
        geojson = combine([parseShp(shpBuffer, prjText), []]) as GeoJSON.FeatureCollection;
      }

      const features: MineFeatureInput[] = geojson.features.map((feature, index) => {
        const props = feature.properties || {};
        const name = props.name || props.NAME || props.Name || props.id || `Feature ${index + 1}`;

        let lat = 0;
        let lng = 0;
        let coordinates: [number, number][][] | undefined;
        let type: "point" | "polygon" = "point";

        if (feature.geometry.type === "Point") {
          lng = feature.geometry.coordinates[0];
          lat = feature.geometry.coordinates[1];
        } else if (
          feature.geometry.type === "MultiPoint" ||
          feature.geometry.type === "LineString"
        ) {
          const coords = feature.geometry.coordinates;
          if (coords && coords.length > 0) {
            lng = coords[0][0];
            lat = coords[0][1];
          }
        } else if (feature.geometry.type === "Polygon") {
          type = "polygon";
          // Store all rings (exterior + holes) as [lat, lng] pairs
          coordinates = feature.geometry.coordinates.map((ring: number[][]) =>
            ring.map((c) => [c[1], c[0]] as [number, number]),
          );
          const exterior = feature.geometry.coordinates[0];
          if (exterior && exterior.length > 0) {
            lng = exterior[0][0];
            lat = exterior[0][1];
          }
        } else if (feature.geometry.type === "MultiPolygon") {
          type = "polygon";
          // Flatten all polygons' rings so Leaflet renders every sub-polygon
          coordinates = feature.geometry.coordinates.flatMap(
            (polygon: number[][][]) =>
              polygon.map((ring: number[][]) =>
                ring.map((c) => [c[1], c[0]] as [number, number]),
              ),
          );
          const firstRing = feature.geometry.coordinates[0]?.[0];
          if (firstRing && firstRing.length > 0) {
            lng = firstRing[0][0];
            lat = firstRing[0][1];
          }
        }

        return {
          id: `imported-${Date.now()}-${index}`,
          name: String(name),
          type,
          lat,
          lng,
          coordinates,
          properties: props,
        };
      });

      // Save layer + features to DB via API
      const { layerId, inserted } = await saveLayer(layerName.trim(), features);

      // Build a LayerWithFeatures-shaped response so the parent can update its list
      const now = new Date().toISOString();
      const savedLayer: LayerWithFeatures = {
        id: layerId,
        name: layerName.trim(),
        description: null,
        importedAt: now,
        importedBy: "",
        features: features.map((f) => ({
          ...f,
          layerId,
          coordinates: f.coordinates ?? null,
          importedAt: now,
          importedBy: "",
        })),
      };

      setFiles((prev) => prev.map((f) => ({ ...f, status: "success" as const })));
      onDataLoaded(savedLayer);
      toast.success(`Saved ${inserted} features to layer "${layerName.trim()}"`);
    } catch (error) {
      console.error("Error parsing/saving SHP:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to process SHP file.",
      );
      setFiles((prev) => prev.map((f) => ({ ...f, status: "error" as const })));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [layerName],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="bg-background/95 backdrop-blur border rounded-lg shadow-lg w-80 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b">
        <div className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          <span className="text-sm font-medium">Import SHP Data</span>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>

      <div className="p-3 space-y-3">
        {/* Layer name input */}
        <div className="space-y-1">
          <Label htmlFor="layer-name" className="text-xs">
            Layer name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="layer-name"
            placeholder="e.g. Amazon Basin 2024"
            value={layerName}
            onChange={(e) => setLayerName(e.target.value)}
            className="h-8 text-sm"
          />
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }
          `}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground mb-1">Drag & drop SHP files here</p>
          <p className="text-xs text-muted-foreground/75">Supports .shp, .shx, .dbf, .prj</p>
          <input
            type="file"
            accept=".shp,.shx,.dbf,.prj"
            multiple
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 text-xs"
              >
                {file.status === "pending" && isProcessing && (
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
                {file.status === "success" && <CheckCircle className="w-3 h-3 text-green-500" />}
                {file.status === "error" && <AlertCircle className="w-3 h-3 text-red-500" />}
                {file.status === "pending" && !isProcessing && (
                  <FileWarning className="w-3 h-3 text-muted-foreground" />
                )}
                <span className="flex-1 truncate">{file.name}</span>
                <span className="text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            ))}
          </div>
        )}

        <div className="p-2 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Upload .shp, .dbf, and .prj files together for complete attribute
            data and correct projection.
          </p>
        </div>
      </div>
    </div>
  );
}

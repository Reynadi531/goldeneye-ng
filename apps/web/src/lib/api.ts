import { env } from "@goldeneye-ng/env/web";

const BASE = env.VITE_SERVER_URL;

// ── Feature ──────────────────────────────────────────────────────────────────

export interface MineFeatureRow {
  id: string;
  layerId: string;
  name: string;
  type: "point" | "polygon";
  lat: number;
  lng: number;
  coordinates: [number, number][] | null;
  properties: Record<string, unknown>;
  importedAt: string;
  importedBy: string;
}

export interface MineFeatureInput {
  id: string;
  name: string;
  type: "point" | "polygon";
  lat: number;
  lng: number;
  coordinates?: [number, number][];
  properties: Record<string, unknown>;
}

// ── Layer ─────────────────────────────────────────────────────────────────────

export interface LayerRow {
  id: string;
  name: string;
  description: string | null;
  importedAt: string;
  importedBy: string;
}

export interface LayerWithFeatures extends LayerRow {
  features: MineFeatureRow[];
}

// ── API helpers ───────────────────────────────────────────────────────────────

export async function getLayers(): Promise<LayerWithFeatures[]> {
  const res = await fetch(`${BASE}/api/layers`, { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to load layers: ${res.status}`);
  return res.json();
}

export async function saveLayer(
  name: string,
  features: MineFeatureInput[],
  description?: string,
): Promise<{ layerId: string; inserted: number }> {
  const res = await fetch(`${BASE}/api/layers`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, features }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function deleteLayer(id: string): Promise<void> {
  const res = await fetch(`${BASE}/api/layers/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to delete layer: ${res.status}`);
}

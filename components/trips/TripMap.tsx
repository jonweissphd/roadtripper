"use client";

import {
  AdvancedMarker,
  APIProvider,
  Map,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { useEffect, useMemo } from "react";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "";
const MAP_ID =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID ?? "DEMO_MAP_ID";

export type MapPoint = { lat: number; lng: number };

export type MapMatch = {
  google_place_id: string;
  name: string;
  lat: number;
  lng: number;
};

// Marker palette uses ink-green / clay-amber rather than red/green so the
// origin/destination distinction holds for red-green color-blind users.
const MARKER = {
  origin: { bg: "#3a5a3d", border: "#1d2e1f", glyph: "#f5f4ee" },
  destination: { bg: "#b46a3c", border: "#6e3f22", glyph: "#fbf6ee" },
  match: { bg: "#d8d4c5", border: "#615e54", glyph: "#1d2010" },
  matchActive: { bg: "#3a5a3d", border: "#1d2e1f", glyph: "#f5f4ee" },
  route: "#3a5a3d",
} as const;

export function TripMap({
  origin,
  destination,
  polylinePath,
  matches,
  selectedId,
  onSelect,
}: {
  origin: MapPoint;
  destination: MapPoint;
  polylinePath: MapPoint[];
  matches: MapMatch[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const allPoints = useMemo<MapPoint[]>(
    () => [
      origin,
      destination,
      ...matches.map((m) => ({ lat: m.lat, lng: m.lng })),
    ],
    [origin, destination, matches],
  );

  if (!MAPS_KEY) {
    return (
      <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 text-center text-sm text-muted-foreground">
        Set <code className="rounded bg-background px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY</code>{" "}
        to view the map.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
      <div className="h-[420px]">
        <APIProvider apiKey={MAPS_KEY}>
          <Map
            mapId={MAP_ID}
            defaultCenter={origin}
            defaultZoom={5}
            gestureHandling="greedy"
            fullscreenControl={false}
            mapTypeControl={false}
            streetViewControl={false}
            style={{ width: "100%", height: "100%" }}
          >
            <FitBounds points={allPoints} />
            <RoutePolyline path={polylinePath} />

            <AdvancedMarker position={origin} title="Start">
              <Pin
                background={MARKER.origin.bg}
                borderColor={MARKER.origin.border}
                glyphColor={MARKER.origin.glyph}
              />
            </AdvancedMarker>
            <AdvancedMarker position={destination} title="Destination">
              <Pin
                background={MARKER.destination.bg}
                borderColor={MARKER.destination.border}
                glyphColor={MARKER.destination.glyph}
              />
            </AdvancedMarker>

            {matches.map((m) => {
              const active = selectedId === m.google_place_id;
              const palette = active ? MARKER.matchActive : MARKER.match;
              return (
                <AdvancedMarker
                  key={m.google_place_id}
                  position={{ lat: m.lat, lng: m.lng }}
                  title={m.name}
                  onClick={() => onSelect(active ? null : m.google_place_id)}
                >
                  <Pin
                    background={palette.bg}
                    borderColor={palette.border}
                    glyphColor={palette.glyph}
                    scale={active ? 1.25 : 1}
                  />
                </AdvancedMarker>
              );
            })}
          </Map>
        </APIProvider>
      </div>
    </div>
  );
}

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  // Stable key so we only refit when the actual point set changes,
  // not on every selection-driven re-render.
  const key = useMemo(
    () => points.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|"),
    [points],
  );

  useEffect(() => {
    if (!map || points.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    for (const p of points) bounds.extend(p);
    map.fitBounds(bounds, 64);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);

  return null;
}

function RoutePolyline({ path }: { path: MapPoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (!map || path.length < 2) return;
    const polyline = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: MARKER.route,
      strokeOpacity: 0.85,
      strokeWeight: 4,
      map,
    });
    return () => {
      polyline.setMap(null);
    };
  }, [map, path]);
  return null;
}

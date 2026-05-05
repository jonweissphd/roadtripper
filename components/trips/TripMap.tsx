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
      <div className="flex h-64 items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground">
        Set NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY to view the map.
      </div>
    );
  }

  return (
    <div className="h-[400px] overflow-hidden rounded-lg border">
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
              background="#10b981"
              borderColor="#065f46"
              glyphColor="white"
            />
          </AdvancedMarker>
          <AdvancedMarker position={destination} title="Destination">
            <Pin
              background="#ef4444"
              borderColor="#7f1d1d"
              glyphColor="white"
            />
          </AdvancedMarker>

          {matches.map((m) => {
            const active = selectedId === m.google_place_id;
            return (
              <AdvancedMarker
                key={m.google_place_id}
                position={{ lat: m.lat, lng: m.lng }}
                title={m.name}
                onClick={() => onSelect(active ? null : m.google_place_id)}
              >
                <Pin
                  background={active ? "#3b82f6" : "#f59e0b"}
                  borderColor={active ? "#1e40af" : "#92400e"}
                  glyphColor="white"
                  scale={active ? 1.3 : 1}
                />
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>
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
    map.fitBounds(bounds, 60);
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
      strokeColor: "#3b82f6",
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

"use client";

import { useCallback, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Point = { lat: number; lng: number };
type Waypoint = Point & { name: string; google_place_id: string; detour_seconds: number };

function formatDuration(seconds: number): string {
  if (seconds < 60) return "<1 min";
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function buildGoogleMapsUrl(
  origin: Point,
  destination: Point,
  originAddress: string,
  destAddress: string,
  waypoints: Waypoint[],
  order: string[] | null,
  isExplore: boolean,
): string {
  // If we have an optimized order, use it. Otherwise sort by distance from origin.
  let sorted: Waypoint[];
  if (order) {
    const byId = new Map(waypoints.map((w) => [w.google_place_id, w]));
    sorted = order.map((id) => byId.get(id)).filter(Boolean) as Waypoint[];
  } else {
    sorted = [...waypoints].sort((a, b) => {
      const da = (a.lat - origin.lat) ** 2 + (a.lng - origin.lng) ** 2;
      const db = (b.lat - origin.lat) ** 2 + (b.lng - origin.lng) ** 2;
      return da - db;
    });
  }

  if (isExplore) {
    const parts = [
      originAddress,
      ...sorted.map((w) => `${w.lat},${w.lng}`),
      originAddress,
    ];
    return `https://www.google.com/maps/dir/${parts.map((p) => encodeURIComponent(p)).join("/")}`;
  }

  const parts = [
    originAddress,
    ...sorted.map((w) => `${w.lat},${w.lng}`),
    destAddress,
  ];
  return `https://www.google.com/maps/dir/${parts.map((p) => encodeURIComponent(p)).join("/")}`;
}

type OptimizeResult = {
  baselineDurationSeconds: number | null;
  totalDurationSeconds: number;
  addedSeconds: number | null;
  orderedPlaceIds: string[];
};

export function LaunchBar({
  tripId,
  origin,
  destination,
  originAddress,
  destAddress,
  waypoints,
  isExplore = false,
}: {
  tripId: string;
  origin: Point;
  destination: Point;
  originAddress: string;
  destAddress: string;
  waypoints: Waypoint[];
  isExplore?: boolean;
}) {
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeResult, setOptimizeResult] = useState<OptimizeResult | null>(null);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  // Estimated added time = sum of individual detour_seconds (rough upper bound).
  const estimatedAddedSecs = waypoints.reduce(
    (sum, w) => sum + w.detour_seconds,
    0,
  );

  const optimize = useCallback(async () => {
    setOptimizing(true);
    setOptimizeError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          waypoints: waypoints.map((w) => ({
            lat: w.lat,
            lng: w.lng,
            google_place_id: w.google_place_id,
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Optimization failed");
      }
      const data = (await res.json()) as OptimizeResult;
      setOptimizeResult(data);
    } catch (err) {
      setOptimizeError(err instanceof Error ? err.message : "Failed");
    } finally {
      setOptimizing(false);
    }
  }, [tripId, waypoints]);

  const url = buildGoogleMapsUrl(
    origin,
    destination,
    originAddress,
    destAddress,
    waypoints,
    optimizeResult?.orderedPlaceIds ?? null,
    isExplore,
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-8">
        {/* Left: trip summary */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span>
            <span className="font-semibold text-foreground">
              {waypoints.length}
            </span>{" "}
            <span className="text-muted-foreground">
              {waypoints.length === 1 ? "stop" : "stops"}
            </span>
          </span>
          <span className="text-border/80" aria-hidden>&middot;</span>
          {optimizeResult ? (
            <>
              <span className="font-semibold text-foreground">
                {formatDuration(optimizeResult.totalDurationSeconds)}
              </span>
              <span className="text-muted-foreground">total</span>
              {optimizeResult.addedSeconds != null && (
                <span className="text-muted-foreground">
                  (+{formatDuration(optimizeResult.addedSeconds)}{" "}
                  {isExplore ? "driving" : "detour"})
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground">
              ~{formatDuration(estimatedAddedSecs)}{" "}
              {isExplore ? "driving" : "added"}
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          {optimizeError && (
            <span className="text-xs text-destructive">{optimizeError}</span>
          )}
          {waypoints.length >= 2 && !optimizeResult && (
            <Button
              variant="outline"
              size="sm"
              onClick={optimize}
              disabled={optimizing}
              className={cn(
                "text-[0.6875rem] font-semibold uppercase tracking-[0.1em]",
                optimizing && "animate-pulse",
              )}
            >
              {optimizing ? "Optimizing..." : "Optimize route"}
            </Button>
          )}
          {optimizeResult && (
            <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.1em] text-primary">
              Optimized
            </span>
          )}
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ size: "sm" })}
          >
            Open in Maps
          </a>
        </div>
      </div>
    </div>
  );
}

"use client";

import { buttonVariants } from "@/components/ui/button";

type Point = { lat: number; lng: number };
type Waypoint = Point & { name: string; google_place_id: string };

function buildGoogleMapsUrl(
  origin: Point,
  destination: Point,
  originAddress: string,
  destAddress: string,
  waypoints: Waypoint[],
  isExplore: boolean,
): string {
  // Sort waypoints by distance from origin so the route order makes sense.
  const sorted = [...waypoints].sort((a, b) => {
    const da =
      (a.lat - origin.lat) ** 2 + (a.lng - origin.lng) ** 2;
    const db =
      (b.lat - origin.lat) ** 2 + (b.lng - origin.lng) ** 2;
    return da - db;
  });

  if (isExplore) {
    // For explore mode: start from the area, visit each place, loop back.
    const parts = [
      originAddress,
      ...sorted.map((w) => `${w.lat},${w.lng}`),
      originAddress,
    ];
    return `https://www.google.com/maps/dir/${parts.map((p) => encodeURIComponent(p)).join("/")}`;
  }

  // Google Maps URL format: /maps/dir/origin/wp1/wp2/destination
  const parts = [
    originAddress,
    ...sorted.map((w) => `${w.lat},${w.lng}`),
    destAddress,
  ];

  return `https://www.google.com/maps/dir/${parts.map((p) => encodeURIComponent(p)).join("/")}`;
}

export function LaunchBar({
  origin,
  destination,
  originAddress,
  destAddress,
  waypoints,
  isExplore = false,
}: {
  origin: Point;
  destination: Point;
  originAddress: string;
  destAddress: string;
  waypoints: Waypoint[];
  isExplore?: boolean;
}) {
  const url = buildGoogleMapsUrl(
    origin,
    destination,
    originAddress,
    destAddress,
    waypoints,
    isExplore,
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-6 py-3">
        <span className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">
            {waypoints.length}
          </span>{" "}
          {waypoints.length === 1 ? "stop" : "stops"} selected
        </span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants()}
        >
          Open in Google Maps
        </a>
      </div>
    </div>
  );
}

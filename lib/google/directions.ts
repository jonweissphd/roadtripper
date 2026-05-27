import "server-only";
import type { LatLng } from "./polyline";

const SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

export type Route = {
  encodedPolyline: string;
  durationSeconds: number;
  distanceMeters: number;
};

// Routes API (the modern Directions). Uses field mask to keep cost minimal.
export async function fetchRoute(
  origin: LatLng,
  destination: LatLng,
): Promise<Route | null> {
  if (!SERVER_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set");

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": SERVER_KEY,
        "X-Goog-FieldMask":
          "routes.polyline.encodedPolyline,routes.duration,routes.distanceMeters",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: { latitude: origin.lat, longitude: origin.lng },
          },
        },
        destination: {
          location: {
            latLng: { latitude: destination.lat, longitude: destination.lng },
          },
        },
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Routes API ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    routes?: Array<{
      polyline: { encodedPolyline: string };
      duration: string;
      distanceMeters: number;
    }>;
  };

  const route = data.routes?.[0];
  if (!route) return null;

  return {
    encodedPolyline: route.polyline.encodedPolyline,
    durationSeconds: parseDuration(route.duration),
    distanceMeters: route.distanceMeters,
  };
}

export type OptimizedRoute = {
  durationSeconds: number;
  distanceMeters: number;
  /** The waypoint order that minimises driving time (0-indexed into the input). */
  waypointOrder: number[];
};

/**
 * Compute a route with intermediate waypoints. When `optimize` is true the
 * API reorders the waypoints to minimise total driving time (TSP-style).
 */
export async function fetchRouteWithWaypoints(
  origin: LatLng,
  destination: LatLng,
  waypoints: LatLng[],
  optimize = true,
): Promise<OptimizedRoute | null> {
  if (!SERVER_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set");
  if (waypoints.length === 0) return null;

  const response = await fetch(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": SERVER_KEY,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.optimizedIntermediateWaypointIndex",
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: { latitude: origin.lat, longitude: origin.lng },
          },
        },
        destination: {
          location: {
            latLng: { latitude: destination.lat, longitude: destination.lng },
          },
        },
        intermediates: waypoints.map((w) => ({
          location: {
            latLng: { latitude: w.lat, longitude: w.lng },
          },
        })),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
        optimizeWaypointOrder: optimize,
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Routes API ${response.status}: ${text}`);
  }

  const data = (await response.json()) as {
    routes?: Array<{
      duration: string;
      distanceMeters: number;
      optimizedIntermediateWaypointIndex?: number[];
    }>;
  };

  const route = data.routes?.[0];
  if (!route) return null;

  return {
    durationSeconds: parseDuration(route.duration),
    distanceMeters: route.distanceMeters,
    waypointOrder:
      route.optimizedIntermediateWaypointIndex ??
      waypoints.map((_, i) => i),
  };
}

// Routes API returns durations as "1234s".
function parseDuration(value: string): number {
  return parseInt(value.replace(/s$/, ""), 10);
}

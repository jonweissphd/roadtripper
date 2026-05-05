import "server-only";
import type { LatLng } from "./polyline";

const SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

type MatrixElement = {
  originIndex: number;
  destinationIndex: number;
  duration: string;
  condition: string;
};

async function computeRouteMatrix(
  origins: LatLng[],
  destinations: LatLng[],
): Promise<MatrixElement[]> {
  if (!SERVER_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set");
  if (origins.length === 0 || destinations.length === 0) return [];

  const response = await fetch(
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": SERVER_KEY,
        "X-Goog-FieldMask": "originIndex,destinationIndex,duration,condition",
      },
      body: JSON.stringify({
        origins: origins.map((o) => ({
          waypoint: {
            location: { latLng: { latitude: o.lat, longitude: o.lng } },
          },
        })),
        destinations: destinations.map((d) => ({
          waypoint: {
            location: { latLng: { latitude: d.lat, longitude: d.lng } },
          },
        })),
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_UNAWARE",
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Route Matrix ${response.status}: ${text}`);
  }

  // REST endpoint returns a JSON array of elements.
  const data = (await response.json()) as MatrixElement[];
  return Array.isArray(data) ? data : [];
}

// For each candidate place: extra driving time vs. the straight A→B route.
// Returns Infinity for places where one of the legs has no route.
export async function detourSecondsBatch(
  origin: LatLng,
  destination: LatLng,
  baselineSeconds: number,
  places: LatLng[],
): Promise<number[]> {
  if (places.length === 0) return [];

  const [aToP, pToB] = await Promise.all([
    computeRouteMatrix([origin], places),
    computeRouteMatrix(places, [destination]),
  ]);

  const aToPByDest = new Map<number, number>();
  for (const e of aToP) {
    if (e.condition === "ROUTE_EXISTS") {
      aToPByDest.set(e.destinationIndex, parseDurationSeconds(e.duration));
    }
  }

  const pToBByOrigin = new Map<number, number>();
  for (const e of pToB) {
    if (e.condition === "ROUTE_EXISTS") {
      pToBByOrigin.set(e.originIndex, parseDurationSeconds(e.duration));
    }
  }

  return places.map((_, i) => {
    const t1 = aToPByDest.get(i);
    const t2 = pToBByOrigin.get(i);
    if (t1 === undefined || t2 === undefined) return Infinity;
    return Math.max(0, t1 + t2 - baselineSeconds);
  });
}

function parseDurationSeconds(value: string): number {
  return parseInt(value.replace(/s$/, ""), 10);
}

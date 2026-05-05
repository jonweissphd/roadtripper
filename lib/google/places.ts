import "server-only";
import type { LatLng } from "./polyline";

const SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

// Pass 1: cheap discovery — IDs only.
export async function searchTextNearbyIds(
  query: string,
  center: LatLng,
  radiusMeters: number,
): Promise<string[]> {
  if (!SERVER_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set");

  const response = await fetch(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": SERVER_KEY,
        "X-Goog-FieldMask": "places.id",
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: radiusMeters,
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Places searchText ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { places?: Array<{ id: string }> };
  return (data.places ?? []).map((p) => p.id).filter(Boolean);
}

export type PlaceDetails = {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  primaryType?: string;
  regularOpeningHours?: {
    weekdayDescriptions?: string[];
    openNow?: boolean;
  };
  photos?: Array<{ name: string; widthPx?: number; heightPx?: number }>;
  reviews?: Array<{
    text?: { text: string };
    rating?: number;
    relativePublishTimeDescription?: string;
    authorAttribution?: { displayName?: string };
  }>;
  websiteUri?: string;
  googleMapsUri?: string;
};

const DETAIL_FIELDS = [
  "id",
  "displayName",
  "formattedAddress",
  "location",
  "rating",
  "userRatingCount",
  "types",
  "primaryType",
  "regularOpeningHours",
  "photos",
  "reviews",
  "websiteUri",
  "googleMapsUri",
].join(",");

// Pass 2: full details for a place.
export async function fetchPlaceDetails(
  placeId: string,
): Promise<PlaceDetails | null> {
  if (!SERVER_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set");

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      method: "GET",
      headers: {
        "X-Goog-Api-Key": SERVER_KEY,
        "X-Goog-FieldMask": DETAIL_FIELDS,
      },
    },
  );

  if (!response.ok) {
    return null;
  }

  return (await response.json()) as PlaceDetails;
}

// Resolve a Place photo's short-lived media URL.
// `photoName` looks like "places/<id>/photos/<photo_id>".
export async function fetchPlacePhotoUrl(
  photoName: string,
  maxWidthPx = 800,
): Promise<string | null> {
  if (!SERVER_KEY) throw new Error("GOOGLE_MAPS_SERVER_KEY is not set");

  const url = new URL(
    `https://places.googleapis.com/v1/${photoName}/media`,
  );
  url.searchParams.set("maxWidthPx", String(maxWidthPx));
  url.searchParams.set("skipHttpRedirect", "true");

  const response = await fetch(url.toString(), {
    headers: { "X-Goog-Api-Key": SERVER_KEY },
  });
  if (!response.ok) return null;

  const data = (await response.json()) as { photoUri?: string };
  return data.photoUri ?? null;
}

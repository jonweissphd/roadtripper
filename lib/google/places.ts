import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LatLng } from "./polyline";

const SERVER_KEY = process.env.GOOGLE_MAPS_SERVER_KEY;

/** Cache TTL: 14 days. */
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

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

/** Fetch from Google Places API directly (no cache). */
async function fetchPlaceDetailsFromGoogle(
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

/**
 * Pass 2: full details for a single place (cache-aware).
 * Checks Supabase cache first, falls back to Google API.
 */
export async function fetchPlaceDetails(
  placeId: string,
): Promise<PlaceDetails | null> {
  const admin = createAdminClient();
  const { data: cached } = await admin
    .from("place_details_cache")
    .select("details, fetched_at")
    .eq("google_place_id", placeId)
    .maybeSingle();

  if (cached) {
    const age = Date.now() - new Date(cached.fetched_at).getTime();
    if (age < CACHE_TTL_MS) {
      return cached.details as PlaceDetails;
    }
  }

  const details = await fetchPlaceDetailsFromGoogle(placeId);
  if (!details) return null;

  // Upsert into cache (fire-and-forget).
  admin
    .from("place_details_cache")
    .upsert({
      google_place_id: placeId,
      details: details as unknown as Record<string, unknown>,
      fetched_at: new Date().toISOString(),
    })
    .then(({ error }) => {
      if (error) console.error("Cache write failed for", placeId, error.message);
    });

  return details;
}

/**
 * Batch-fetch place details with a single cache lookup.
 * Much faster than 80 individual fetchPlaceDetails calls.
 */
export async function fetchPlaceDetailsBatch(
  placeIds: string[],
): Promise<Map<string, PlaceDetails>> {
  if (placeIds.length === 0) return new Map();

  const admin = createAdminClient();
  const { data: cached } = await admin
    .from("place_details_cache")
    .select("google_place_id, details, fetched_at")
    .in("google_place_id", placeIds);

  const result = new Map<string, PlaceDetails>();
  const staleOrMissing: string[] = [];
  const now = Date.now();

  for (const row of cached ?? []) {
    const age = now - new Date(row.fetched_at).getTime();
    if (age < CACHE_TTL_MS) {
      result.set(row.google_place_id, row.details as PlaceDetails);
    } else {
      staleOrMissing.push(row.google_place_id);
    }
  }

  // Find IDs not in cache at all.
  const cachedIds = new Set((cached ?? []).map((r) => r.google_place_id));
  for (const id of placeIds) {
    if (!cachedIds.has(id)) staleOrMissing.push(id);
  }

  // Fetch missing from Google in parallel.
  if (staleOrMissing.length > 0) {
    const fetched = await Promise.all(
      staleOrMissing.map(async (id) => ({
        id,
        details: await fetchPlaceDetailsFromGoogle(id),
      })),
    );

    // Upsert all newly fetched into cache (fire-and-forget).
    const toUpsert = fetched
      .filter((f) => f.details !== null)
      .map((f) => ({
        google_place_id: f.id,
        details: f.details as unknown as Record<string, unknown>,
        fetched_at: new Date().toISOString(),
      }));

    if (toUpsert.length > 0) {
      admin
        .from("place_details_cache")
        .upsert(toUpsert)
        .then(({ error }) => {
          if (error) console.error("Batch cache write failed", error.message);
        });
    }

    for (const f of fetched) {
      if (f.details) result.set(f.id, f.details);
    }
  }

  return result;
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

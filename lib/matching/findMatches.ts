import "server-only";
import { fetchRoute } from "@/lib/google/directions";
import { detourSecondsBatch } from "@/lib/google/distanceMatrix";
import {
  fetchPlaceDetails,
  searchTextNearbyIds,
  type PlaceDetails,
} from "@/lib/google/places";
import {
  decodePolyline,
  perpDistanceMeters,
  samplePoints,
  type LatLng,
} from "@/lib/google/polyline";
import { rerankPlaces, type RerankInput } from "./rerank";

const MILES_TO_METERS = 1609.344;
const SAMPLE_RADIUS_M = 12 * MILES_TO_METERS;
const SAMPLE_SPACING_M = 13 * MILES_TO_METERS;
const MAX_SAMPLES = 20;
const CORRIDOR_RADIUS_M = 10 * MILES_TO_METERS;
const MAX_CANDIDATES_FOR_DETOUR = 50;
const MAX_DISPLAY = 30;
const FOOD_DRINK_CAP = 0.2;

const FOOD_DRINK_TYPES = new Set([
  "restaurant",
  "food",
  "bakery",
  "cafe",
  "bar",
  "meal_delivery",
  "meal_takeaway",
  "ice_cream_shop",
  "pizza_restaurant",
  "burger_restaurant",
  "sushi_restaurant",
  "seafood_restaurant",
  "steak_house",
  "sandwich_shop",
  "coffee_shop",
  "brunch_restaurant",
  "breakfast_restaurant",
  "fast_food_restaurant",
  "american_restaurant",
  "chinese_restaurant",
  "indian_restaurant",
  "italian_restaurant",
  "japanese_restaurant",
  "korean_restaurant",
  "mexican_restaurant",
  "thai_restaurant",
  "vietnamese_restaurant",
  "vegetarian_restaurant",
  "vegan_restaurant",
  "ramen_restaurant",
  "barbecue_restaurant",
]);

function isFoodOrDrink(types: string[]): boolean {
  return types.some((t) => FOOD_DRINK_TYPES.has(t));
}

export type SharedInterest = {
  slug: string;
  search_keywords: string[];
  // 2 if both travelers picked this tag, 1 if only one (or solo). Drives ranking.
  weight: number;
};

export type MatchResult = {
  place_id: string;
  name: string;
  formatted_address?: string;
  lat: number;
  lng: number;
  rating?: number;
  review_count?: number;
  primary_photo_id?: string;
  matched_interests: string[];
  shared_tags_count: number;
  detour_seconds: number;
  editorial_score?: number;
  editorial_reasoning?: string;
  raw: PlaceDetails;
};

export type MatchComputeResult = {
  matches: MatchResult[];
  encodedPolyline: string | null;
};

export async function findMatches(
  origin: LatLng,
  destination: LatLng,
  sharedInterests: SharedInterest[],
  routeRange?: { start: number; end: number },
  localsOnly = false,
): Promise<MatchComputeResult> {
  if (sharedInterests.length === 0) {
    return { matches: [], encodedPolyline: null };
  }

  const weightBySlug = new Map(
    sharedInterests.map((i) => [i.slug, i.weight]),
  );

  // 1. Route + decode polyline.
  const route = await fetchRoute(origin, destination);
  if (!route) return { matches: [], encodedPolyline: null };
  const polyline = decodePolyline(route.encodedPolyline);

  // 2. Sample circles along the route, scoped to the requested range.
  const allSamples = samplePoints(polyline, SAMPLE_SPACING_M, MAX_SAMPLES);
  const start = routeRange?.start ?? 0;
  const end = routeRange?.end ?? 1;
  const startIdx = Math.floor(start * allSamples.length);
  const endIdx = Math.ceil(end * allSamples.length);
  const samples = allSamples.slice(startIdx, endIdx);

  // Slice the polyline to the requested range so corridor filtering only
  // considers the relevant section (prevents early-route places leaking into
  // "Late" results and vice versa).
  const polyStartIdx = Math.floor(start * polyline.length);
  const polyEndIdx = Math.ceil(end * polyline.length);
  const corridorPolyline =
    start === 0 && end === 1
      ? polyline
      : polyline.slice(polyStartIdx, Math.max(polyEndIdx, polyStartIdx + 2));

  // 3. Discovery: searchText for each (interest keyword × sample).
  // Track which interest slugs each place hits.
  const placeMatches = new Map<string, Set<string>>();

  await Promise.all(
    sharedInterests.flatMap((interest) =>
      interest.search_keywords.flatMap((keyword) =>
        samples.map(async (sample) => {
          try {
            const ids = await searchTextNearbyIds(
              keyword,
              sample,
              SAMPLE_RADIUS_M,
            );
            for (const id of ids) {
              if (!placeMatches.has(id)) placeMatches.set(id, new Set());
              placeMatches.get(id)!.add(interest.slug);
            }
          } catch (err) {
            console.error(
              `searchText failed for "${keyword}" near ${sample.lat},${sample.lng}`,
              err,
            );
          }
        }),
      ),
    ),
  );

  if (placeMatches.size === 0) {
    return { matches: [], encodedPolyline: route.encodedPolyline };
  }

  // 4. Rank candidates by shared-tags-hit, take top N for the (more expensive) detail fetch.
  const sortedIds = [...placeMatches.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, MAX_CANDIDATES_FOR_DETOUR)
    .map(([id]) => id);

  const detailsResults = await Promise.all(
    sortedIds.map(async (id) => ({
      id,
      details: await fetchPlaceDetails(id),
    })),
  );

  // 5. Filter to corridor.
  type Candidate = {
    id: string;
    name: string;
    lat: number;
    lng: number;
    formatted_address?: string;
    rating?: number;
    review_count?: number;
    primary_photo_id?: string;
    types: string[];
    review_excerpts: string[];
    raw: PlaceDetails;
  };

  const candidates: Candidate[] = [];
  for (const { id, details } of detailsResults) {
    if (!details?.location) continue;
    const point: LatLng = {
      lat: details.location.latitude,
      lng: details.location.longitude,
    };
    if (perpDistanceMeters(point, corridorPolyline) > CORRIDOR_RADIUS_M) continue;

    const reviews = details.reviews ?? [];
    const photos = details.photos ?? [];

    candidates.push({
      id,
      name: details.displayName?.text ?? "Unnamed place",
      lat: point.lat,
      lng: point.lng,
      formatted_address: details.formattedAddress,
      rating: details.rating,
      review_count: details.userRatingCount,
      primary_photo_id: photos[0]?.name,
      types: details.types ?? [],
      review_excerpts: reviews
        .slice(0, 3)
        .map((r) => (r.text?.text ?? "").slice(0, 280)),
      raw: details,
    });
  }

  if (candidates.length === 0) {
    return { matches: [], encodedPolyline: route.encodedPolyline };
  }

  // 6. Detour times via Distance Matrix (batched).
  const detours = await detourSecondsBatch(
    origin,
    destination,
    route.durationSeconds,
    candidates.map((c) => ({ lat: c.lat, lng: c.lng })),
  );

  // 7. Rerank with Gemini.
  const rerankInput: RerankInput[] = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    formatted_address: c.formatted_address,
    rating: c.rating,
    review_count: c.review_count,
    matched_interests: [...(placeMatches.get(c.id) ?? [])],
    review_excerpts: c.review_excerpts,
    types: c.types,
  }));

  const rerankResults = await rerankPlaces(rerankInput, localsOnly);
  const rerankById = new Map(rerankResults.map((r) => [r.id, r]));

  // 8. Filter chains when locals-only is on, then assemble + sort.
  const filtered = localsOnly
    ? candidates.filter((c) => {
        const rerank = rerankById.get(c.id);
        if (rerank && rerank.score <= 2) return false;
        return true;
      })
    : candidates;

  // Build a detour lookup so we can map filtered candidates back to their detour times.
  const detourById = new Map(candidates.map((c, i) => [c.id, detours[i]]));

  // shared_tags_count is repurposed as the weighted match score: each matched
  // tag contributes its weight (1 for one user, 2 for both). Solo trips
  // collapse to "count of my matched tags". Paired trips elevate places that
  // hit tags both travelers picked.
  const results: MatchResult[] = filtered.map((c) => {
    const matchedSlugs = [...(placeMatches.get(c.id) ?? [])];
    const rerank = rerankById.get(c.id);
    const matchScore = matchedSlugs.reduce(
      (sum, slug) => sum + (weightBySlug.get(slug) ?? 0),
      0,
    );
    return {
      place_id: c.id,
      name: c.name,
      formatted_address: c.formatted_address,
      lat: c.lat,
      lng: c.lng,
      rating: c.rating,
      review_count: c.review_count,
      primary_photo_id: c.primary_photo_id,
      matched_interests: matchedSlugs,
      shared_tags_count: matchScore,
      detour_seconds: detourById.get(c.id) ?? Infinity,
      editorial_score: rerank?.score,
      editorial_reasoning: rerank?.reasoning,
      raw: c.raw,
    };
  });

  const sorted = results
    .filter((r) => Number.isFinite(r.detour_seconds))
    .sort((a, b) => {
      if (b.shared_tags_count !== a.shared_tags_count) {
        return b.shared_tags_count - a.shared_tags_count;
      }
      // Prefer non-food places when match scores are equal.
      const aFood = isFoodOrDrink(a.raw.types ?? []) ? 0 : 1;
      const bFood = isFoodOrDrink(b.raw.types ?? []) ? 0 : 1;
      if (aFood !== bFood) return bFood - aFood;
      const ae = a.editorial_score ?? 0;
      const be = b.editorial_score ?? 0;
      if (be !== ae) return be - ae;
      return a.detour_seconds - b.detour_seconds;
    });

  const foodCap = Math.floor(MAX_DISPLAY * FOOD_DRINK_CAP);
  const matches: MatchResult[] = [];
  const seenNames = new Set<string>();
  let foodCount = 0;
  for (const r of sorted) {
    if (matches.length >= MAX_DISPLAY) break;
    // Deduplicate chains — keep only the best-scored location of each name.
    const normName = r.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seenNames.has(normName)) continue;
    seenNames.add(normName);
    const isFood = isFoodOrDrink(r.raw.types ?? []);
    if (isFood && foodCount >= foodCap) continue;
    matches.push(r);
    if (isFood) foodCount++;
  }

  return { matches, encodedPolyline: route.encodedPolyline };
}

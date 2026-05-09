import "server-only";
import {
  fetchPlaceDetails,
  searchTextNearbyIds,
  type PlaceDetails,
} from "@/lib/google/places";
import { haversineMeters, type LatLng } from "@/lib/google/polyline";
import { rerankPlaces, type RerankInput } from "./rerank";

const MILES_TO_METERS = 1609.344;
const SEARCH_RADIUS_M = 8 * MILES_TO_METERS;
const MAX_DISTANCE_M = 30 * MILES_TO_METERS; // Hard cutoff: drop anything 30+ miles away
const MAX_CANDIDATES = 50;
const MAX_DISPLAY = 30;
const FOOD_DRINK_CAP = 0.2;

const FOOD_DRINK_TYPES = new Set([
  "restaurant", "food", "bakery", "cafe", "bar", "meal_delivery",
  "meal_takeaway", "ice_cream_shop", "pizza_restaurant", "burger_restaurant",
  "sushi_restaurant", "seafood_restaurant", "steak_house", "sandwich_shop",
  "coffee_shop", "brunch_restaurant", "breakfast_restaurant",
  "fast_food_restaurant", "american_restaurant", "chinese_restaurant",
  "indian_restaurant", "italian_restaurant", "japanese_restaurant",
  "korean_restaurant", "mexican_restaurant", "thai_restaurant",
  "vietnamese_restaurant", "vegetarian_restaurant", "vegan_restaurant",
  "ramen_restaurant", "barbecue_restaurant",
]);

function isFoodOrDrink(types: string[]): boolean {
  return types.some((t) => FOOD_DRINK_TYPES.has(t));
}

export type SharedInterest = {
  slug: string;
  search_keywords: string[];
  weight: number;
};

export type NearbyResult = {
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
  distance_meters: number;
  editorial_score?: number;
  editorial_reasoning?: string;
  raw: PlaceDetails;
};

export async function findNearby(
  center: LatLng,
  sharedInterests: SharedInterest[],
  localsOnly = false,
): Promise<NearbyResult[]> {
  if (sharedInterests.length === 0) return [];

  const weightBySlug = new Map(
    sharedInterests.map((i) => [i.slug, i.weight]),
  );

  // 1. Discovery: search for each interest keyword around the center.
  const placeMatches = new Map<string, Set<string>>();

  await Promise.all(
    sharedInterests.flatMap((interest) =>
      interest.search_keywords.map(async (keyword) => {
        try {
          const ids = await searchTextNearbyIds(
            keyword,
            center,
            SEARCH_RADIUS_M,
          );
          for (const id of ids) {
            if (!placeMatches.has(id)) placeMatches.set(id, new Set());
            placeMatches.get(id)!.add(interest.slug);
          }
        } catch (err) {
          console.error(
            `searchText failed for "${keyword}" near ${center.lat},${center.lng}`,
            err,
          );
        }
      }),
    ),
  );

  if (placeMatches.size === 0) return [];

  // 2. Rank by tag hits, take top N for detail fetch.
  const sortedIds = [...placeMatches.entries()]
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, MAX_CANDIDATES)
    .map(([id]) => id);

  const detailsResults = await Promise.all(
    sortedIds.map(async (id) => ({
      id,
      details: await fetchPlaceDetails(id),
    })),
  );

  // 3. Build candidates with distance from center.
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
    distance_meters: number;
    raw: PlaceDetails;
  };

  const candidates: Candidate[] = [];
  for (const { id, details } of detailsResults) {
    if (!details?.location) continue;
    const point: LatLng = {
      lat: details.location.latitude,
      lng: details.location.longitude,
    };
    const dist = haversineMeters(center, point);
    if (dist > MAX_DISTANCE_M) continue; // Too far — Google bias isn't a hard filter

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
      distance_meters: dist,
      raw: details,
    });
  }

  if (candidates.length === 0) return [];

  // 4. Rerank with Gemini.
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

  // 5. Filter chains when locals-only is on, then assemble + sort.
  const filtered = localsOnly
    ? candidates.filter((c) => {
        const rerank = rerankById.get(c.id);
        // Drop anything Gemini scored 2 or below (likely a chain).
        if (rerank && rerank.score <= 2) return false;
        return true;
      })
    : candidates;
  const results: NearbyResult[] = filtered.map((c) => {
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
      distance_meters: c.distance_meters,
      editorial_score: rerank?.score,
      editorial_reasoning: rerank?.reasoning,
      raw: c.raw,
    };
  });

  const sorted = results.sort((a, b) => {
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
    return a.distance_meters - b.distance_meters;
  });

  const foodCap = Math.floor(MAX_DISPLAY * FOOD_DRINK_CAP);
  const matches: NearbyResult[] = [];
  const seenNames = new Set<string>();
  let foodCount = 0;
  for (const r of sorted) {
    if (matches.length >= MAX_DISPLAY) break;
    // Deduplicate chains — keep only the closest location of each name.
    const normName = r.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seenNames.has(normName)) continue;
    seenNames.add(normName);
    const isFood = isFoodOrDrink(r.raw.types ?? []);
    if (isFood && foodCount >= foodCap) continue;
    matches.push(r);
    if (isFood) foodCount++;
  }

  return matches;
}

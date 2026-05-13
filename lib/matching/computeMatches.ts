import "server-only";
import { findMatches } from "./findMatches";
import { findNearby } from "./findNearby";
import { createAdminClient } from "@/lib/supabase/admin";

export type ComputeParams = {
  tripId: string;
  trip: {
    creator_id: string;
    guest_id: string | null;
    origin_lat: number;
    origin_lng: number;
    dest_lat: number;
    dest_lng: number;
    trip_type: string;
  };
  weighted: Array<{
    slug: string;
    search_keywords: string[];
    category: string;
    weight: number;
  }>;
  routeRange?: { start: number; end: number };
  localsOnly: boolean;
};

/**
 * Run the full match-compute pipeline and write results to Supabase.
 * Used inside `after()` so the response returns immediately.
 */
export async function computeAndStoreMatches(params: ComputeParams): Promise<void> {
  const { tripId, trip, weighted, routeRange, localsOnly } = params;
  const admin = createAdminClient();
  const isExplore = trip.trip_type === "explore";

  try {
    let matchRows: Array<{
      place_id: string;
      name: string;
      formatted_address?: string;
      lat: number;
      lng: number;
      detour_seconds: number;
      rating?: number;
      review_count?: number;
      primary_photo_id?: string;
      matched_interests: string[];
      shared_tags_count: number;
      editorial_score?: number;
      editorial_reasoning?: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      raw: any;
    }> = [];
    let encodedPolyline: string | null = null;

    if (isExplore) {
      const nearby = await findNearby(
        { lat: trip.origin_lat, lng: trip.origin_lng },
        weighted,
        localsOnly,
      );
      matchRows = nearby.map((n) => ({
        place_id: n.place_id,
        name: n.name,
        formatted_address: n.formatted_address,
        lat: n.lat,
        lng: n.lng,
        detour_seconds: Math.round(n.distance_meters / 15),
        rating: n.rating,
        review_count: n.review_count,
        primary_photo_id: n.primary_photo_id,
        matched_interests: n.matched_interests,
        shared_tags_count: n.shared_tags_count,
        editorial_score: n.editorial_score,
        editorial_reasoning: n.editorial_reasoning,
        raw: n.raw,
      }));
    } else {
      const result = await findMatches(
        { lat: trip.origin_lat, lng: trip.origin_lng },
        { lat: trip.dest_lat, lng: trip.dest_lng },
        weighted,
        routeRange,
        localsOnly,
      );
      encodedPolyline = result.encodedPolyline;
      matchRows = result.matches.map((m) => ({
        place_id: m.place_id,
        name: m.name,
        formatted_address: m.formatted_address,
        lat: m.lat,
        lng: m.lng,
        detour_seconds: m.detour_seconds,
        rating: m.rating,
        review_count: m.review_count,
        primary_photo_id: m.primary_photo_id,
        matched_interests: m.matched_interests,
        shared_tags_count: m.shared_tags_count,
        editorial_score: m.editorial_score,
        editorial_reasoning: m.editorial_reasoning,
        raw: m.raw,
      }));
    }

    // Write results.
    await admin.from("trip_matches").delete().eq("trip_id", tripId);

    if (matchRows.length > 0) {
      const rows = matchRows.map((m) => ({
        trip_id: tripId,
        google_place_id: m.place_id,
        name: m.name,
        formatted_address: m.formatted_address ?? null,
        lat: m.lat,
        lng: m.lng,
        detour_seconds: m.detour_seconds,
        rating: m.rating ?? null,
        review_count: m.review_count ?? null,
        primary_photo_id: m.primary_photo_id ?? null,
        matched_interests: m.matched_interests,
        shared_tags_count: m.shared_tags_count,
        editorial_score: m.editorial_score ?? null,
        editorial_reasoning: m.editorial_reasoning ?? null,
        raw: m.raw,
      }));
      const { error } = await admin.from("trip_matches").insert(rows);
      if (error) throw new Error(error.message);
    }

    // Mark compute as done.
    await admin
      .from("trips")
      .update({
        matches_computed_at: new Date().toISOString(),
        matches_combined: !!trip.guest_id,
        route_polyline: encodedPolyline,
        match_compute_status: "done",
        match_compute_error: null,
      })
      .eq("id", tripId);
  } catch (err) {
    console.error("computeAndStoreMatches failed:", err);
    await admin
      .from("trips")
      .update({
        match_compute_status: "error",
        match_compute_error:
          err instanceof Error ? err.message : "Unknown error",
      })
      .eq("id", tripId);
  }
}

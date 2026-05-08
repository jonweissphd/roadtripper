import { NextResponse } from "next/server";
import { findMatches } from "@/lib/matching/findMatches";
import { findNearby } from "@/lib/matching/findNearby";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Match compute can take 10-15s on long routes. Vercel Hobby caps at 10s; Pro is 60s.
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await context.params;

  const body = (await request.json().catch(() => ({}))) as {
    routeStart?: number;
    routeEnd?: number;
  };
  const routeRange =
    typeof body.routeStart === "number" && typeof body.routeEnd === "number"
      ? {
          start: Math.max(0, body.routeStart),
          end: Math.min(1, body.routeEnd),
        }
      : undefined;

  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, creator_id, guest_id, origin_lat, origin_lng, dest_lat, dest_lng, trip_type",
    )
    .eq("id", tripId)
    .maybeSingle();

  if (!trip) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const isExplore = trip.trip_type === "explore";

  // Union of interests across whoever is on the trip.
  const [creatorRes, guestRes] = await Promise.all([
    supabase
      .from("profile_interests")
      .select("interest_id")
      .eq("profile_id", trip.creator_id),
    trip.guest_id
      ? supabase
          .from("profile_interests")
          .select("interest_id")
          .eq("profile_id", trip.guest_id)
      : Promise.resolve({ data: [] as { interest_id: string }[] }),
  ]);

  const creatorIds = new Set(
    (creatorRes.data ?? []).map((r) => r.interest_id),
  );
  const guestIds = new Set((guestRes.data ?? []).map((r) => r.interest_id));
  const allIds = new Set([...creatorIds, ...guestIds]);

  if (allIds.size === 0) {
    const admin = createAdminClient();
    await admin.from("trip_matches").delete().eq("trip_id", tripId);
    await admin
      .from("trips")
      .update({
        matches_computed_at: new Date().toISOString(),
        matches_combined: !!trip.guest_id,
      })
      .eq("id", tripId);
    return NextResponse.json({
      ok: true,
      count: 0,
      reason: "Pick some interests on /profile before searching for stops.",
    });
  }

  const { data: interests } = await supabase
    .from("interests")
    .select("id, slug, search_keywords")
    .in("id", [...allIds]);

  const weighted = (interests ?? []).map((i) => ({
    slug: i.slug,
    search_keywords: i.search_keywords,
    weight:
      (creatorIds.has(i.id) ? 1 : 0) + (guestIds.has(i.id) ? 1 : 0),
  }));

  // Branch: explore mode searches around a point, road trip follows a route.
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

  const admin = createAdminClient();
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
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  await admin
    .from("trips")
    .update({
      matches_computed_at: new Date().toISOString(),
      matches_combined: !!trip.guest_id,
      route_polyline: encodedPolyline,
    })
    .eq("id", tripId);

  return NextResponse.json({ ok: true, count: matchRows.length });
}

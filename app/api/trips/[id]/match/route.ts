import { NextResponse } from "next/server";
import { findMatches } from "@/lib/matching/findMatches";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Match compute can take 10-15s on long routes. Vercel Hobby caps at 10s; Pro is 60s.
export const maxDuration = 60;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, creator_id, guest_id, origin_lat, origin_lng, dest_lat, dest_lng",
    )
    .eq("id", tripId)
    .maybeSingle();

  if (!trip) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  if (!trip.guest_id) {
    return NextResponse.json(
      { error: "Trip needs both travelers before computing matches." },
      { status: 400 },
    );
  }

  // Shared interests = intersection of both users' interest sets.
  const [creatorRes, guestRes] = await Promise.all([
    supabase
      .from("profile_interests")
      .select("interest_id")
      .eq("profile_id", trip.creator_id),
    supabase
      .from("profile_interests")
      .select("interest_id")
      .eq("profile_id", trip.guest_id),
  ]);

  const creatorIds = new Set(
    (creatorRes.data ?? []).map((r) => r.interest_id),
  );
  const sharedIds = (guestRes.data ?? [])
    .map((r) => r.interest_id)
    .filter((id) => creatorIds.has(id));

  if (sharedIds.length === 0) {
    const admin = createAdminClient();
    await admin.from("trip_matches").delete().eq("trip_id", tripId);
    await admin
      .from("trips")
      .update({ matches_computed_at: new Date().toISOString() })
      .eq("id", tripId);
    return NextResponse.json({
      ok: true,
      count: 0,
      reason:
        "No shared interests yet — both travelers need overlapping picks on /profile.",
    });
  }

  const { data: interests } = await supabase
    .from("interests")
    .select("slug, search_keywords")
    .in("id", sharedIds);

  const { matches, encodedPolyline } = await findMatches(
    { lat: trip.origin_lat, lng: trip.origin_lng },
    { lat: trip.dest_lat, lng: trip.dest_lng },
    (interests ?? []).map((i) => ({
      slug: i.slug,
      search_keywords: i.search_keywords,
    })),
  );

  const admin = createAdminClient();
  await admin.from("trip_matches").delete().eq("trip_id", tripId);

  if (matches.length > 0) {
    const rows = matches.map((m) => ({
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
      route_polyline: encodedPolyline,
    })
    .eq("id", tripId);

  return NextResponse.json({ ok: true, count: matches.length });
}

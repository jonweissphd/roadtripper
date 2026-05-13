import { after, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { computeAndStoreMatches } from "@/lib/matching/computeMatches";

// Vercel Pro: 60s. Hobby: capped at 10s regardless of this setting.
// With after() + polling the response returns instantly anyway.
export const maxDuration = 60;

/**
 * GET — Poll for match compute status.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await context.params;

  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("match_compute_status, match_compute_error, match_compute_started_at, matches_computed_at")
    .eq("id", tripId)
    .maybeSingle();

  if (!trip) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Stale detection: if computing for 2+ minutes, it probably crashed.
  if (trip.match_compute_status === "computing" && trip.match_compute_started_at) {
    const elapsed = Date.now() - new Date(trip.match_compute_started_at).getTime();
    if (elapsed > 120_000) {
      const admin = createAdminClient();
      await admin
        .from("trips")
        .update({
          match_compute_status: "error",
          match_compute_error: "Computation timed out. Please try again.",
        })
        .eq("id", tripId);
      return NextResponse.json({
        status: "error",
        error: "Computation timed out. Please try again.",
      });
    }
  }

  if (trip.match_compute_status === "computing") {
    return NextResponse.json({ status: "computing" });
  }

  if (trip.match_compute_status === "error") {
    return NextResponse.json({
      status: "error",
      error: trip.match_compute_error ?? "Unknown error",
    });
  }

  // Status is 'done' or null (idle / completed previously).
  return NextResponse.json({
    status: "done",
    matchesComputedAt: trip.matches_computed_at,
  });
}

/**
 * POST — Kick off match compute in the background via after().
 * Returns immediately so Vercel's 10s timeout is never hit.
 */
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
      "id, creator_id, guest_id, origin_lat, origin_lng, dest_lat, dest_lng, trip_type, match_compute_status",
    )
    .eq("id", tripId)
    .maybeSingle();

  if (!trip) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Prevent double-submit: if already computing, just return status.
  if (trip.match_compute_status === "computing") {
    return NextResponse.json({ status: "computing" });
  }

  // Check if any traveler wants locals-only.
  const [creatorProfileRes, guestProfileRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("locals_only")
      .eq("id", trip.creator_id)
      .maybeSingle(),
    trip.guest_id
      ? supabase
          .from("profiles")
          .select("locals_only")
          .eq("id", trip.guest_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const localsOnly =
    creatorProfileRes.data?.locals_only || guestProfileRes.data?.locals_only || false;

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
        match_compute_status: "done",
        match_compute_error: null,
      })
      .eq("id", tripId);
    return NextResponse.json({
      status: "done",
      count: 0,
      reason: "Pick some interests on /profile before searching for stops.",
    });
  }

  const { data: interests } = await supabase
    .from("interests")
    .select("id, slug, search_keywords, category")
    .in("id", [...allIds]);

  const weighted = (interests ?? []).map((i) => ({
    slug: i.slug,
    search_keywords: i.search_keywords,
    category: i.category,
    weight:
      (creatorIds.has(i.id) ? 1 : 0) + (guestIds.has(i.id) ? 1 : 0),
  }));

  // Mark as computing BEFORE returning so the GET poller sees it.
  const admin = createAdminClient();
  await admin
    .from("trips")
    .update({
      match_compute_status: "computing",
      match_compute_error: null,
      match_compute_started_at: new Date().toISOString(),
    })
    .eq("id", tripId);

  // Schedule the heavy compute to run after the response is sent.
  after(async () => {
    await computeAndStoreMatches({
      tripId,
      trip,
      weighted,
      routeRange,
      localsOnly,
    });
  });

  return NextResponse.json({ status: "computing" });
}

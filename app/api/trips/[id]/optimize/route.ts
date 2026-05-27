import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchRoute, fetchRouteWithWaypoints } from "@/lib/google/directions";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/trips/:id/optimize
 *
 * Body: { waypoints: Array<{ lat: number; lng: number; google_place_id: string }> }
 *
 * Returns the optimized route with total duration, baseline duration,
 * and the reordered waypoint IDs.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: tripId } = await params;
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("origin_lat, origin_lng, dest_lat, dest_lng, trip_type")
    .eq("id", tripId)
    .maybeSingle();

  if (!trip) {
    return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  }

  const body = (await request.json()) as {
    waypoints?: Array<{ lat: number; lng: number; google_place_id: string }>;
  };
  const waypoints = body.waypoints ?? [];

  if (waypoints.length === 0) {
    return NextResponse.json(
      { error: "No waypoints provided" },
      { status: 400 },
    );
  }

  const origin = { lat: trip.origin_lat, lng: trip.origin_lng };
  const destination =
    trip.trip_type === "explore"
      ? origin // Explore mode: loop back to start
      : { lat: trip.dest_lat, lng: trip.dest_lng };

  try {
    // Fetch baseline (no stops) and optimized (with stops) in parallel.
    const [baseline, optimized] = await Promise.all([
      fetchRoute(origin, destination),
      fetchRouteWithWaypoints(
        origin,
        destination,
        waypoints.map((w) => ({ lat: w.lat, lng: w.lng })),
        true, // optimize order
      ),
    ]);

    if (!optimized) {
      return NextResponse.json(
        { error: "Could not compute route" },
        { status: 500 },
      );
    }

    // Reorder the waypoint IDs according to the optimized order.
    const orderedIds = optimized.waypointOrder.map(
      (idx) => waypoints[idx].google_place_id,
    );

    return NextResponse.json({
      baselineDurationSeconds: baseline?.durationSeconds ?? null,
      totalDurationSeconds: optimized.durationSeconds,
      totalDistanceMeters: optimized.distanceMeters,
      addedSeconds:
        baseline != null
          ? Math.max(0, optimized.durationSeconds - baseline.durationSeconds)
          : null,
      orderedPlaceIds: orderedIds,
    });
  } catch (err) {
    console.error("Optimize route error:", err);
    return NextResponse.json(
      { error: "Route optimization failed" },
      { status: 500 },
    );
  }
}

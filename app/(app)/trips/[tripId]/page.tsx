import { redirect } from "next/navigation";
import { CopyInviteLink } from "@/components/trips/CopyInviteLink";
import { FindMatchesButton } from "@/components/trips/FindMatchesButton";
import { type MatchRow } from "@/components/trips/MatchList";
import { TripContent } from "@/components/trips/TripContent";
import { createClient } from "@/lib/supabase/server";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, creator_id, guest_id, origin_address, origin_lat, origin_lng, dest_address, dest_lat, dest_lng, status, invite_token, matches_computed_at, route_polyline",
    )
    .eq("id", tripId)
    .maybeSingle();

  if (!trip) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Trip not found</h1>
        <p className="text-sm text-muted-foreground">
          This trip doesn&apos;t exist or you don&apos;t have access.
        </p>
      </main>
    );
  }

  const partnerId =
    trip.creator_id === user.id ? trip.guest_id : trip.creator_id;

  const [partnerRes, matchesRes, allInterestsRes, mineRes, theirsRes] =
    await Promise.all([
      partnerId
        ? supabase
            .from("profiles")
            .select("display_name")
            .eq("id", partnerId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("trip_matches")
        .select(
          "google_place_id, name, formatted_address, lat, lng, detour_seconds, rating, review_count, matched_interests, shared_tags_count",
        )
        .eq("trip_id", tripId)
        .order("shared_tags_count", { ascending: false })
        .order("editorial_score", { ascending: false, nullsFirst: false })
        .order("detour_seconds", { ascending: true }),
      supabase.from("interests").select("id, slug, label"),
      supabase
        .from("profile_interests")
        .select("interest_id")
        .eq("profile_id", user.id),
      partnerId
        ? supabase
            .from("profile_interests")
            .select("interest_id")
            .eq("profile_id", partnerId)
        : Promise.resolve({ data: null }),
    ]);

  const partnerName = partnerRes.data?.display_name ?? null;
  const matches = (matchesRes.data ?? []) as MatchRow[];

  const allInterests = allInterestsRes.data ?? [];
  const interestLabels: Record<string, string> = Object.fromEntries(
    allInterests.map((i) => [i.slug, i.label]),
  );
  const slugById: Record<string, string> = Object.fromEntries(
    allInterests.map((i) => [i.id, i.slug]),
  );

  const mySlugs = new Set(
    (mineRes.data ?? [])
      .map((r) => slugById[r.interest_id])
      .filter(Boolean),
  );
  const theirSlugs = new Set(
    (theirsRes.data ?? [])
      .map((r) => slugById[r.interest_id])
      .filter(Boolean),
  );
  const both = [...mySlugs].filter((s) => theirSlugs.has(s));
  const justMine = [...mySlugs].filter((s) => !theirSlugs.has(s));
  const justTheirs = [...theirSlugs].filter((s) => !mySlugs.has(s));

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/join/${trip.invite_token}`;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-6 py-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Your trip</h1>
        <p className="text-sm text-muted-foreground">
          {trip.origin_address} → {trip.dest_address}
        </p>
      </div>

      {!trip.guest_id ? (
        <div className="space-y-3 rounded-lg border p-4">
          <p className="text-sm font-medium">Invite your travel buddy</p>
          <p className="text-xs text-muted-foreground">
            Share this link. They&apos;ll be added to the trip when they
            accept.
          </p>
          <CopyInviteLink url={inviteUrl} />
        </div>
      ) : (
        <>
          <div className="space-y-2 rounded-lg border p-4">
            <p className="text-sm">
              You and{" "}
              <span className="font-medium">{partnerName ?? "your buddy"}</span>{" "}
              are paired up.
            </p>
            <div className="grid gap-2 pt-2 text-xs sm:grid-cols-3">
              <div>
                <div className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Both of you
                </div>
                <div className="mt-1">
                  {both.length > 0
                    ? both.map((s) => interestLabels[s] ?? s).join(", ")
                    : "—"}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Just you
                </div>
                <div className="mt-1">
                  {justMine.length > 0
                    ? justMine.map((s) => interestLabels[s] ?? s).join(", ")
                    : "—"}
                </div>
              </div>
              <div>
                <div className="font-semibold uppercase tracking-wider text-muted-foreground">
                  Just them
                </div>
                <div className="mt-1">
                  {justTheirs.length > 0
                    ? justTheirs.map((s) => interestLabels[s] ?? s).join(", ")
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Matches along your route</h2>
              {trip.matches_computed_at && (
                <p className="text-xs text-muted-foreground">
                  Last updated {timeAgo(trip.matches_computed_at)}
                </p>
              )}
            </div>
            <FindMatchesButton
              tripId={tripId}
              label={trip.matches_computed_at ? "Refresh" : "Find our matches"}
            />
          </div>

          {trip.matches_computed_at && (
            <TripContent
              tripId={tripId}
              origin={{ lat: trip.origin_lat, lng: trip.origin_lng }}
              destination={{ lat: trip.dest_lat, lng: trip.dest_lng }}
              encodedPolyline={trip.route_polyline}
              matches={matches}
              interestLabels={interestLabels}
            />
          )}
        </>
      )}
    </main>
  );
}

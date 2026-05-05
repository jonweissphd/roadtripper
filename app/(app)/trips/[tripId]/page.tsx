import { redirect } from "next/navigation";
import { Eyebrow } from "@/components/ui/eyebrow";
import { CopyInviteLink } from "@/components/trips/CopyInviteLink";
import { FindMatchesButton } from "@/components/trips/FindMatchesButton";
import { type MatchRow } from "@/components/trips/MatchList";
import { TripContent } from "@/components/trips/TripContent";
import { getCurrentUser } from "@/lib/auth";
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
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, creator_id, guest_id, origin_address, origin_lat, origin_lng, dest_address, dest_lat, dest_lng, status, invite_token, matches_computed_at, matches_combined, route_polyline",
    )
    .eq("id", tripId)
    .maybeSingle();

  if (!trip) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-16">
        <div className="space-y-3 text-center">
          <Eyebrow>Trip</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight">
            Trip not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This trip doesn&apos;t exist or you don&apos;t have access.
          </p>
        </div>
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
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:py-14">
      <header className="space-y-2 pb-8">
        <Eyebrow>Your trip</Eyebrow>
        <h1 className="text-pretty text-2xl font-semibold leading-tight tracking-tight sm:text-[1.75rem]">
          <span className="text-foreground">{trip.origin_address}</span>
          <span className="px-2 text-muted-foreground/70">→</span>
          <span className="text-foreground">{trip.dest_address}</span>
        </h1>
      </header>

      <div className="space-y-10">
        {trip.guest_id && (
          <section className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-base">
                You and{" "}
                <span className="font-semibold tracking-tight">
                  {partnerName ?? "your buddy"}
                </span>
              </span>
              <span className="text-sm text-muted-foreground">
                are paired up.
              </span>
            </div>
            <div className="mt-5 grid gap-x-6 gap-y-5 border-t border-border/60 pt-5 sm:grid-cols-3">
              <div className="space-y-1.5">
                <div className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Both of you
                </div>
                <div className="text-sm">
                  {both.length > 0
                    ? both.map((s) => interestLabels[s] ?? s).join(", ")
                    : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Just you
                </div>
                <div className="text-sm">
                  {justMine.length > 0
                    ? justMine.map((s) => interestLabels[s] ?? s).join(", ")
                    : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  Just them
                </div>
                <div className="text-sm">
                  {justTheirs.length > 0
                    ? justTheirs.map((s) => interestLabels[s] ?? s).join(", ")
                    : <span className="text-muted-foreground">—</span>}
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-6">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
            <div className="space-y-1">
              <Eyebrow>Stops along your route</Eyebrow>
              <h2 className="text-xl font-semibold tracking-tight sm:text-[1.375rem]">
                {trip.matches_computed_at
                  ? trip.guest_id
                    ? "Matches"
                    : "Your stops"
                  : trip.guest_id
                    ? "Find places you'll both love"
                    : "Find your stops"}
              </h2>
              {trip.matches_computed_at && (
                <p className="text-xs text-muted-foreground">
                  Last updated {timeAgo(trip.matches_computed_at)}
                </p>
              )}
            </div>
            <FindMatchesButton
              tripId={tripId}
              label={
                trip.matches_computed_at
                  ? trip.guest_id && !trip.matches_combined
                    ? "Refresh combined"
                    : "Refresh"
                  : "Find matches"
              }
            />
          </div>

          {trip.guest_id && trip.matches_computed_at && !trip.matches_combined && (
            <div className="rounded-md border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-foreground">
              These matches are still based on your interests alone. Refresh to
              combine with {partnerName ?? "your buddy"}&apos;s picks.
            </div>
          )}

          {trip.matches_computed_at ? (
            <TripContent
              tripId={tripId}
              origin={{ lat: trip.origin_lat, lng: trip.origin_lng }}
              destination={{ lat: trip.dest_lat, lng: trip.dest_lng }}
              encodedPolyline={trip.route_polyline}
              matches={matches}
              interestLabels={interestLabels}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
              <p className="mx-auto max-w-[36ch] text-sm text-muted-foreground">
                Tap{" "}
                <span className="font-medium text-foreground">
                  Find matches
                </span>{" "}
                and we&apos;ll scan a corridor along your route, then rank the
                best stops{trip.guest_id ? " for the two of you" : ""}.
              </p>
            </div>
          )}
        </section>

        {!trip.guest_id && (
          <section className="rounded-xl border border-border/70 bg-card p-5 sm:p-6">
            <div className="space-y-1.5">
              <h2 className="text-base font-semibold tracking-tight">
                Going with someone?
              </h2>
              <p className="text-sm text-muted-foreground">
                Share this link. When they join, we&apos;ll combine your
                interests so the next refresh ranks places you&apos;ll both
                love.
              </p>
            </div>
            <div className="pt-4">
              <CopyInviteLink url={inviteUrl} />
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

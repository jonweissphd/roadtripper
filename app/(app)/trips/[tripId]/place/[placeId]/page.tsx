import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import type { PlaceDetails } from "@/lib/google/places";
import { createClient } from "@/lib/supabase/server";

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ tripId: string; placeId: string }>;
}) {
  const { tripId, placeId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: match } = await supabase
    .from("trip_matches")
    .select(
      "name, formatted_address, lat, lng, rating, review_count, matched_interests, editorial_reasoning, raw",
    )
    .eq("trip_id", tripId)
    .eq("google_place_id", placeId)
    .maybeSingle();

  if (!match) {
    return (
      <main className="mx-auto w-full max-w-2xl space-y-4 px-6 py-12">
        <Link
          href={`/trips/${tripId}`}
          className="text-sm text-muted-foreground"
        >
          ← Back to trip
        </Link>
        <h1 className="text-2xl font-semibold">Place not found</h1>
        <p className="text-sm text-muted-foreground">
          This place isn&apos;t in your match list. It may have been removed
          when matches were refreshed.
        </p>
      </main>
    );
  }

  const details = match.raw as PlaceDetails;

  const matchedSlugs: string[] = match.matched_interests ?? [];
  const { data: interestRows } = matchedSlugs.length
    ? await supabase
        .from("interests")
        .select("slug, label")
        .in("slug", matchedSlugs)
    : { data: [] as Array<{ slug: string; label: string }> };
  const interestLabels: Record<string, string> = Object.fromEntries(
    (interestRows ?? []).map((r) => [r.slug, r.label]),
  );

  const userAgent = (await headers()).get("user-agent") ?? "";
  const isApple = /iPhone|iPad|iPod|Macintosh/i.test(userAgent);
  const appleMapsUrl = `maps://?q=${encodeURIComponent(match.name)}&ll=${match.lat},${match.lng}`;
  const googleMapsUrl =
    details.googleMapsUri ??
    `https://www.google.com/maps/search/?api=1&query=${match.lat},${match.lng}&query_place_id=${placeId}`;
  const deepLink = isApple ? appleMapsUrl : googleMapsUrl;
  const deepLinkLabel = isApple ? "Open in Apple Maps" : "Open in Google Maps";

  const photos = (details.photos ?? []).slice(0, 5);
  const reviews = (details.reviews ?? []).slice(0, 3);
  const hours = details.regularOpeningHours?.weekdayDescriptions ?? [];

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-6 py-8">
      <Link
        href={`/trips/${tripId}`}
        className="text-sm text-muted-foreground hover:text-foreground"
      >
        ← Back to trip
      </Link>

      {photos.length > 0 && (
        <div className="-mx-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-2 sm:overflow-visible sm:px-0">
          {photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.name}
              src={`/api/places/photo?name=${encodeURIComponent(photo.name)}&max=800`}
              alt={match.name}
              className="h-48 w-72 shrink-0 snap-start rounded-lg object-cover sm:h-32 sm:w-full"
              loading="lazy"
            />
          ))}
        </div>
      )}

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">{match.name}</h1>
        {match.formatted_address && (
          <p className="text-sm text-muted-foreground">
            {match.formatted_address}
          </p>
        )}
        {match.rating != null && (
          <p className="text-sm">
            ★ {Number(match.rating).toFixed(1)}
            {match.review_count != null && (
              <span className="text-muted-foreground">
                {" "}
                ({match.review_count} reviews)
              </span>
            )}
          </p>
        )}
      </header>

      {matchedSlugs.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Matches your shared interests
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {matchedSlugs.map((slug) => (
              <span
                key={slug}
                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
              >
                {interestLabels[slug] ?? slug}
              </span>
            ))}
          </div>
          {match.editorial_reasoning && (
            <p className="text-sm italic text-muted-foreground">
              {match.editorial_reasoning}
            </p>
          )}
        </section>
      )}

      <a
        href={deepLink}
        className={buttonVariants({ size: "lg", className: "w-full sm:w-auto" })}
      >
        {deepLinkLabel}
      </a>

      {hours.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Hours
          </h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {hours.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Top reviews
          </h2>
          <ul className="space-y-3">
            {reviews.map((review, i) => (
              <li key={i} className="space-y-1 rounded-lg border p-3">
                <div className="flex flex-wrap items-center gap-x-2 text-sm">
                  {review.rating != null && <span>★ {review.rating}</span>}
                  {review.authorAttribution?.displayName && (
                    <span className="text-muted-foreground">
                      — {review.authorAttribution.displayName}
                    </span>
                  )}
                  {review.relativePublishTimeDescription && (
                    <span className="text-xs text-muted-foreground">
                      · {review.relativePublishTimeDescription}
                    </span>
                  )}
                </div>
                {review.text?.text && (
                  <p className="text-sm">{review.text.text}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
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
      <main className="mx-auto w-full max-w-2xl space-y-6 px-6 py-12">
        <Link
          href={`/trips/${tripId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span aria-hidden>←</span> Back to trip
        </Link>
        <div className="space-y-2">
          <Eyebrow>Place</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight">
            Place not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This place isn&apos;t in your match list. It may have been removed
            when matches were refreshed.
          </p>
        </div>
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
    <main className="mx-auto w-full max-w-3xl px-6 pb-16 pt-6 sm:pt-10">
      <Link
        href={`/trips/${tripId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span aria-hidden>←</span> Back to trip
      </Link>

      {photos.length > 0 && (
        <div className="-mx-6 mt-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-2 sm:mx-0 sm:mt-8 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0">
          {photos.map((photo) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={photo.name}
              src={`/api/places/photo?name=${encodeURIComponent(photo.name)}&max=800`}
              alt={match.name}
              className="h-56 w-72 shrink-0 snap-start rounded-xl object-cover sm:h-36 sm:w-full"
              loading="lazy"
            />
          ))}
        </div>
      )}

      <header className="mt-8 space-y-3 sm:mt-10">
        <Eyebrow>Place</Eyebrow>
        <h1 className="text-pretty text-3xl font-semibold leading-tight tracking-tight sm:text-[2rem]">
          {match.name}
        </h1>
        {match.formatted_address && (
          <p className="text-sm text-muted-foreground">
            {match.formatted_address}
          </p>
        )}
        {match.rating != null && (
          <p data-tabular className="text-sm">
            <span className="font-medium">
              {Number(match.rating).toFixed(1)}
            </span>
            <span className="ml-0.5 text-muted-foreground">★</span>
            {match.review_count != null && (
              <span className="ml-1 text-muted-foreground">
                ({match.review_count} reviews)
              </span>
            )}
          </p>
        )}
      </header>

      {matchedSlugs.length > 0 && (
        <section className="mt-8 space-y-3">
          <Eyebrow>Matches your shared interests</Eyebrow>
          <div className="flex flex-wrap gap-1.5">
            {matchedSlugs.map((slug) => (
              <span
                key={slug}
                className="rounded-full bg-secondary px-2.5 py-0.5 text-[0.7rem] font-medium text-secondary-foreground"
              >
                {interestLabels[slug] ?? slug}
              </span>
            ))}
          </div>
          {match.editorial_reasoning && (
            <p className="border-l-2 border-border/70 pl-3 text-[0.9375rem] italic leading-relaxed text-muted-foreground">
              {match.editorial_reasoning}
            </p>
          )}
        </section>
      )}

      <div className="mt-8">
        <a
          href={deepLink}
          className={buttonVariants({
            size: "lg",
            className: "w-full sm:w-auto",
          })}
        >
          {deepLinkLabel}
        </a>
      </div>

      {hours.length > 0 && (
        <section className="mt-10 space-y-3">
          <Eyebrow>Hours</Eyebrow>
          <ul
            data-tabular
            className="divide-y divide-border/60 rounded-xl border border-border/70 bg-card text-sm"
          >
            {hours.map((line, i) => {
              const [day, ...rest] = line.split(": ");
              const time = rest.join(": ");
              return (
                <li
                  key={i}
                  className="flex items-baseline justify-between px-4 py-2.5"
                >
                  <span className="font-medium">{day}</span>
                  <span className="text-muted-foreground">{time}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="mt-10 space-y-4">
          <Eyebrow>Top reviews</Eyebrow>
          <ul className="space-y-4">
            {reviews.map((review, i) => (
              <li
                key={i}
                className="rounded-xl border border-border/70 bg-card px-5 py-4"
              >
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm">
                  {review.rating != null && (
                    <span data-tabular className="font-medium">
                      {review.rating}
                      <span className="ml-0.5 text-muted-foreground">★</span>
                    </span>
                  )}
                  {review.authorAttribution?.displayName && (
                    <span className="text-muted-foreground">
                      {review.authorAttribution.displayName}
                    </span>
                  )}
                  {review.relativePublishTimeDescription && (
                    <span className="text-xs text-muted-foreground">
                      · {review.relativePublishTimeDescription}
                    </span>
                  )}
                </div>
                {review.text?.text && (
                  <p className="mt-2 text-pretty text-sm leading-relaxed">
                    {review.text.text}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

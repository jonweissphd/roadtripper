"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const INITIAL_SHOW = 8;
const LOAD_MORE = 10;

export type MatchRow = {
  google_place_id: string;
  name: string;
  formatted_address: string | null;
  lat: number;
  lng: number;
  detour_seconds: number;
  rating: number | null;
  review_count: number | null;
  matched_interests: string[];
  shared_tags_count: number;
  primary_photo_id: string | null;
  editorial_reasoning: string | null;
};

const ROAD_TRIP_BUCKETS: Array<{ label: string; emoji: string; subtitle: string; max: number }> = [
  { label: "Quick stops", emoji: "⚡", subtitle: "under 15 min off-route", max: 15 * 60 },
  { label: "Worth the detour", emoji: "🎯", subtitle: "15–30 min off-route", max: 30 * 60 },
  { label: "Side quest", emoji: "🗺️", subtitle: "30+ min off-route", max: Infinity },
];

const EXPLORE_BUCKETS: Array<{ label: string; emoji: string; subtitle: string; max: number }> = [
  { label: "Walking distance", emoji: "🚶", subtitle: "under 10 min drive", max: 10 * 60 },
  { label: "Short drive", emoji: "🚗", subtitle: "10–20 min drive", max: 20 * 60 },
  { label: "Worth the trip", emoji: "🗺️", subtitle: "20+ min away", max: Infinity },
];

function bucketFor(detourSeconds: number, buckets: typeof ROAD_TRIP_BUCKETS): string {
  for (const b of buckets) {
    if (detourSeconds < b.max) return b.label;
  }
  return buckets[buckets.length - 1].label;
}

export function MatchList({
  tripId,
  matches,
  interestLabels,
  selectedId,
  onHover,
  checkedIds,
  onToggle,
  isExplore,
}: {
  tripId: string;
  matches: MatchRow[];
  interestLabels: Record<string, string>;
  selectedId?: string | null;
  onHover?: (id: string | null) => void;
  checkedIds?: Set<string>;
  onToggle?: (id: string) => void;
  isExplore?: boolean;
}) {
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());

  // When selection changes from the map, scroll the list to it.
  useEffect(() => {
    if (!selectedId) return;
    const el = itemRefs.current.get(selectedId);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  if (matches.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/30 px-5 py-10 text-center">
        <p className="mx-auto max-w-[40ch] text-sm text-muted-foreground">
          {isExplore
            ? "No matches found nearby."
            : "No matches in the corridor along your route."}{" "}
          Try adding a few more interests on{" "}
          <Link
            href="/profile"
            className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
          >
            your profile
          </Link>
          , or refresh.
        </p>
      </div>
    );
  }

  const BUCKETS = isExplore ? EXPLORE_BUCKETS : ROAD_TRIP_BUCKETS;
  const grouped: Record<string, MatchRow[]> = {};
  for (const b of BUCKETS) grouped[b.label] = [];
  for (const m of matches) grouped[bucketFor(m.detour_seconds, BUCKETS)].push(m);

  // Track how many items to show per bucket.
  const [showCounts, setShowCounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const b of BUCKETS) init[b.label] = INITIAL_SHOW;
    return init;
  });

  function showMore(bucket: string) {
    setShowCounts((prev) => ({
      ...prev,
      [bucket]: (prev[bucket] ?? INITIAL_SHOW) + LOAD_MORE,
    }));
  }

  return (
    <div className="space-y-9">
      {BUCKETS.map(({ label, emoji, subtitle }) => {
        const items = grouped[label];
        if (items.length === 0) return null;
        const visible = items.slice(0, showCounts[label] ?? INITIAL_SHOW);
        const hasMore = visible.length < items.length;
        return (
          <section key={label} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight">
                  <span className="mr-1.5">{emoji}</span>{label}
                </h3>
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              </div>
              <span
                data-tabular
                className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground"
              >
                {items.length} {items.length === 1 ? "place" : "places"}
              </span>
            </div>
            <ul className="-mx-2 sm:mx-0">
              {visible.map((m, i) => {
                const isSelected = selectedId === m.google_place_id;
                const isLast = i === visible.length - 1 && !hasMore;
                return (
                  <li
                    key={m.google_place_id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(m.google_place_id, el);
                      else itemRefs.current.delete(m.google_place_id);
                    }}
                    onMouseEnter={() => onHover?.(m.google_place_id)}
                    onMouseLeave={() => onHover?.(null)}
                    className={cn(
                      !isLast && "border-b border-border/60",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-start gap-2 rounded-lg px-3 py-3.5 transition-colors duration-150 ease-out sm:px-3",
                        isSelected
                          ? "bg-muted/70"
                          : "hover:bg-muted/50",
                      )}
                    >
                      {onToggle && (
                        <button
                          type="button"
                          aria-label={`Select ${m.name}`}
                          onClick={() => onToggle(m.google_place_id)}
                          className={cn(
                            "mt-1 flex size-5 shrink-0 items-center justify-center rounded border transition-colors",
                            checkedIds?.has(m.google_place_id)
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:border-foreground/40",
                          )}
                        >
                          {checkedIds?.has(m.google_place_id) && (
                            <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M2.5 6l2.5 2.5 4.5-5" />
                            </svg>
                          )}
                        </button>
                      )}
                      <Link
                        href={`/trips/${tripId}/place/${encodeURIComponent(m.google_place_id)}`}
                        className="block min-w-0 flex-1 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35"
                      >
                      <div className="flex gap-3.5">
                        {m.primary_photo_id && (
                          <img
                            src={`/api/places/photo?name=${encodeURIComponent(m.primary_photo_id)}&max=240`}
                            alt=""
                            className="size-[4.5rem] shrink-0 rounded-lg object-cover sm:size-24"
                            loading="lazy"
                          />
                        )}
                        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="text-[0.9375rem] font-semibold leading-snug">
                              {m.name}
                            </div>
                            {m.editorial_reasoning && !m.editorial_reasoning.includes("fallback") && (
                              <div className="line-clamp-2 text-[0.8125rem] leading-relaxed text-muted-foreground">
                                {m.editorial_reasoning}
                              </div>
                            )}
                            {m.matched_interests.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-0.5">
                                {m.matched_interests.map((slug) => (
                                  <span
                                    key={slug}
                                    className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                                  >
                                    {interestLabels[slug] ?? slug}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 space-y-1 text-right">
                            {m.rating != null && (
                              <div
                                data-tabular
                                className="text-sm font-medium"
                              >
                                {m.rating.toFixed(1)}
                                <span className="ml-0.5 text-muted-foreground">
                                  ★
                                </span>
                                {m.review_count != null && (
                                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                                    ({m.review_count})
                                  </span>
                                )}
                              </div>
                            )}
                            <div
                              data-tabular
                              className="text-xs text-muted-foreground"
                            >
                              {isExplore ? "~" : "+"}{Math.round(m.detour_seconds / 60)} min{isExplore ? " away" : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
            {hasMore && (
              <button
                type="button"
                onClick={() => showMore(label)}
                className="w-full rounded-lg border border-border bg-background py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
              >
                Show {Math.min(LOAD_MORE, items.length - visible.length)} more
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}

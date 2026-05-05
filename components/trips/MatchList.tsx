"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

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
};

const BUCKETS: Array<{ label: string; subtitle: string; max: number }> = [
  { label: "Quick stops", subtitle: "under 15 min off-route", max: 15 * 60 },
  { label: "Worth it", subtitle: "15 to 30 min off-route", max: 30 * 60 },
  { label: "Side quest", subtitle: "30+ min off-route", max: Infinity },
];

function bucketFor(detourSeconds: number): string {
  for (const b of BUCKETS) {
    if (detourSeconds < b.max) return b.label;
  }
  return BUCKETS[BUCKETS.length - 1].label;
}

export function MatchList({
  tripId,
  matches,
  interestLabels,
  selectedId,
  onHover,
}: {
  tripId: string;
  matches: MatchRow[];
  interestLabels: Record<string, string>;
  selectedId?: string | null;
  onHover?: (id: string | null) => void;
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
          No matches in the corridor along your route. Try adding a few more
          interests on{" "}
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

  const grouped: Record<string, MatchRow[]> = {};
  for (const b of BUCKETS) grouped[b.label] = [];
  for (const m of matches) grouped[bucketFor(m.detour_seconds)].push(m);

  return (
    <div className="space-y-9">
      {BUCKETS.map(({ label, subtitle }) => {
        const items = grouped[label];
        if (items.length === 0) return null;
        return (
          <section key={label} className="space-y-3">
            <div className="flex items-baseline justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-base font-semibold tracking-tight">
                  {label}
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
              {items.map((m, i) => {
                const isSelected = selectedId === m.google_place_id;
                const isLast = i === items.length - 1;
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
                    <Link
                      href={`/trips/${tripId}/place/${encodeURIComponent(m.google_place_id)}`}
                      className={cn(
                        "block rounded-lg px-3 py-3.5 transition-colors duration-150 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 sm:px-3",
                        isSelected
                          ? "bg-muted/70"
                          : "hover:bg-muted/50",
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="font-medium leading-snug">
                            {m.name}
                          </div>
                          {m.formatted_address && (
                            <div className="truncate text-xs text-muted-foreground">
                              {m.formatted_address}
                            </div>
                          )}
                          {m.matched_interests.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {m.matched_interests.map((slug) => (
                                <span
                                  key={slug}
                                  className="rounded-full bg-secondary px-2 py-0.5 text-[0.7rem] font-medium text-secondary-foreground"
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
                            +{Math.round(m.detour_seconds / 60)} min
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

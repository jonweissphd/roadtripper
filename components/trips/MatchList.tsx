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

const BUCKETS: Array<{ label: string; max: number }> = [
  { label: "Quick stops", max: 15 * 60 },
  { label: "Worth it", max: 30 * 60 },
  { label: "Side quest", max: Infinity },
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
      <p className="text-sm text-muted-foreground">
        No matches found in the corridor along your route. Try adding a few
        more interests on{" "}
        <Link href="/profile" className="underline underline-offset-4">
          your profile
        </Link>{" "}
        or refreshing.
      </p>
    );
  }

  const grouped: Record<string, MatchRow[]> = {};
  for (const b of BUCKETS) grouped[b.label] = [];
  for (const m of matches) grouped[bucketFor(m.detour_seconds)].push(m);

  return (
    <div className="space-y-8">
      {BUCKETS.map(({ label }) => {
        const items = grouped[label];
        if (items.length === 0) return null;
        return (
          <section key={label} className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </h2>
            <ul className="space-y-3">
              {items.map((m) => {
                const isSelected = selectedId === m.google_place_id;
                return (
                  <li
                    key={m.google_place_id}
                    ref={(el) => {
                      if (el) itemRefs.current.set(m.google_place_id, el);
                      else itemRefs.current.delete(m.google_place_id);
                    }}
                    onMouseEnter={() => onHover?.(m.google_place_id)}
                    onMouseLeave={() => onHover?.(null)}
                  >
                    <Link
                      href={`/trips/${tripId}/place/${encodeURIComponent(m.google_place_id)}`}
                      className={cn(
                        "block rounded-lg border p-4 transition-colors",
                        isSelected
                          ? "border-primary bg-muted/60"
                          : "hover:bg-muted/40",
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="font-medium">{m.name}</div>
                          {m.formatted_address && (
                            <div className="text-xs text-muted-foreground">
                              {m.formatted_address}
                            </div>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {m.matched_interests.map((slug) => (
                              <span
                                key={slug}
                                className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                              >
                                {interestLabels[slug] ?? slug}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          {m.rating != null && (
                            <div className="text-sm">
                              ★ {m.rating.toFixed(1)}
                              {m.review_count != null && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  ({m.review_count})
                                </span>
                              )}
                            </div>
                          )}
                          <div className="mt-1 text-xs text-muted-foreground">
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

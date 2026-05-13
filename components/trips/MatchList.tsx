"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const INITIAL_SHOW = 6;
const LOAD_MORE = 8;

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

const CATEGORY_META: Record<string, { label: string; emoji: string }> = {
  food: { label: "Food", emoji: "🍕" },
  drinks: { label: "Drinks", emoji: "☕" },
  nightlife: { label: "Nightlife", emoji: "🌙" },
  shopping: { label: "Shopping", emoji: "🛍️" },
  outdoor: { label: "Outdoors", emoji: "🌿" },
  fitness: { label: "Fitness", emoji: "💪" },
  activities: { label: "Activities", emoji: "🎯" },
  culture: { label: "Culture", emoji: "🎨" },
  animals: { label: "Animals", emoji: "🐾" },
  quirky: { label: "Quirky", emoji: "✨" },
};

const CATEGORY_ORDER = [
  "shopping", "food", "drinks", "nightlife", "outdoor",
  "culture", "quirky", "activities", "animals", "fitness",
];

export function MatchList({
  tripId,
  matches,
  interestLabels,
  categoryBySlug,
  selectedId,
  onHover,
  checkedIds,
  onToggle,
  isExplore,
}: {
  tripId: string;
  matches: MatchRow[];
  interestLabels: Record<string, string>;
  categoryBySlug: Record<string, string>;
  selectedId?: string | null;
  onHover?: (id: string | null) => void;
  checkedIds?: Set<string>;
  onToggle?: (id: string) => void;
  isExplore?: boolean;
}) {
  const itemRefs = useRef<Map<string, HTMLLIElement>>(new Map());
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Scroll to selected item (from map click).
  useEffect(() => {
    if (!selectedId) return;
    const el = itemRefs.current.get(selectedId);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId]);

  // Group matches by category based on their matched_interests.
  // A place can appear in multiple categories if it matches interests in multiple.
  // We assign each place to its PRIMARY category (first matched interest's category).
  const { grouped, categoryList } = useMemo(() => {
    const grouped: Record<string, MatchRow[]> = {};
    const seen = new Map<string, string>(); // place_id → assigned category

    for (const m of matches) {
      // Find the primary category for this place.
      let primaryCat: string | null = null;
      for (const slug of m.matched_interests) {
        const cat = categoryBySlug[slug];
        if (cat) {
          primaryCat = cat;
          break;
        }
      }
      if (!primaryCat) primaryCat = "other";

      // Deduplicate: only show each place once.
      if (seen.has(m.google_place_id)) continue;
      seen.set(m.google_place_id, primaryCat);

      if (!grouped[primaryCat]) grouped[primaryCat] = [];
      grouped[primaryCat].push(m);
    }

    // Build ordered category list (only categories with results).
    const categoryList = CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0);
    // Add any categories not in the predefined order.
    for (const cat of Object.keys(grouped)) {
      if (!categoryList.includes(cat) && grouped[cat].length > 0) {
        categoryList.push(cat);
      }
    }

    return { grouped, categoryList };
  }, [matches, categoryBySlug]);

  // Track show counts per category.
  const [showCounts, setShowCounts] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    for (const cat of CATEGORY_ORDER) init[cat] = INITIAL_SHOW;
    return init;
  });

  function showMore(cat: string) {
    setShowCounts((prev) => ({
      ...prev,
      [cat]: (prev[cat] ?? INITIAL_SHOW) + LOAD_MORE,
    }));
  }

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

  // Categories to display: filtered by active tab or show all.
  const visibleCategories = activeCategory
    ? categoryList.filter((c) => c === activeCategory)
    : categoryList;

  return (
    <div className="space-y-6">
      {/* Category filter tabs */}
      {categoryList.length > 1 && (
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              activeCategory === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            All ({matches.length})
          </button>
          {categoryList.map((cat) => {
            const meta = CATEGORY_META[cat] ?? { label: cat, emoji: "•" };
            const count = grouped[cat]?.length ?? 0;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  activeCategory === cat
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                )}
              >
                {meta.emoji} {meta.label} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Category columns */}
      <div
        className={cn(
          "gap-6",
          activeCategory
            ? "grid grid-cols-1" // Single category: full width
            : visibleCategories.length === 2
              ? "grid grid-cols-1 sm:grid-cols-2"
              : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        )}
      >
        {visibleCategories.map((cat) => {
          const meta = CATEGORY_META[cat] ?? { label: cat, emoji: "•" };
          const items = grouped[cat] ?? [];
          const limit = showCounts[cat] ?? INITIAL_SHOW;
          const visible = items.slice(0, limit);
          const hasMore = visible.length < items.length;

          return (
            <section key={cat} className="space-y-3">
              <div className="flex items-baseline justify-between gap-3 border-b border-border/70 pb-2">
                <h3 className="text-sm font-semibold tracking-tight">
                  <span className="mr-1.5">{meta.emoji}</span>
                  {meta.label}
                </h3>
                <span className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {items.length} {items.length === 1 ? "place" : "places"}
                </span>
              </div>

              <ul className="space-y-0">
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
                      className={cn(!isLast && "border-b border-border/40")}
                    >
                      <div
                        className={cn(
                          "flex items-start gap-2 rounded-lg px-2 py-3 transition-colors duration-150 ease-out",
                          isSelected ? "bg-muted/70" : "hover:bg-muted/50",
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
                          <div className="flex gap-3">
                            {m.primary_photo_id && (
                              <img
                                src={`/api/places/photo?name=${encodeURIComponent(m.primary_photo_id)}&max=240`}
                                alt=""
                                className="size-16 shrink-0 rounded-lg object-cover"
                                loading="lazy"
                              />
                            )}
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="text-sm font-semibold leading-snug">
                                {m.name}
                              </div>
                              {m.editorial_reasoning && !m.editorial_reasoning.includes("fallback") && (
                                <div className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                  {m.editorial_reasoning}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                                {m.rating != null && (
                                  <span className="text-xs font-medium">
                                    {m.rating.toFixed(1)}
                                    <span className="ml-0.5 text-muted-foreground">★</span>
                                    {m.review_count != null && (
                                      <span className="ml-0.5 font-normal text-muted-foreground">
                                        ({m.review_count})
                                      </span>
                                    )}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {isExplore ? "~" : "+"}{Math.round(m.detour_seconds / 60)} min{isExplore ? " away" : ""}
                                </span>
                                <a
                                  href={`https://www.google.com/maps/place/?q=place_id:${m.google_place_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs font-medium text-muted-foreground underline decoration-muted-foreground/30 underline-offset-2 transition-colors hover:text-foreground hover:decoration-foreground/50"
                                >
                                  Maps
                                </a>
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
                  onClick={() => showMore(cat)}
                  className="w-full rounded-lg border border-border bg-background py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
                >
                  Show {Math.min(LOAD_MORE, items.length - visible.length)} more
                </button>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

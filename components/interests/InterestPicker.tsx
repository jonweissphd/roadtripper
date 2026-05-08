"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type Interest = {
  id: string;
  slug: string;
  label: string;
  category: string;
};

export type InterestGroup = {
  category: string;
  interests: Interest[];
};

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food",
  drinks: "Drinks",
  shopping: "Shopping",
  outdoor: "Outdoor",
  activities: "Activities",
  quirky: "Quirky stops",
};

const MIN_FOR_TRIP = 5;

export function InterestPicker({
  groups,
  initial,
}: {
  groups: InterestGroup[];
  initial: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const remaining = Math.max(0, MIN_FOR_TRIP - selected.size);
  const ready = remaining === 0;

  return (
    <div className="space-y-7">
      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="interest_id" value={id} />
      ))}

      <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-muted/40 px-4 py-3">
        <span
          className={cn(
            "inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-sm font-semibold tabular-nums",
            ready
              ? "bg-primary text-primary-foreground"
              : "bg-background text-foreground ring-1 ring-inset ring-border",
          )}
        >
          {selected.size}
        </span>
        <p className="text-sm text-muted-foreground">
          {ready ? (
            <>
              <span className="font-medium text-foreground">
                You&apos;re ready
              </span>{" "}
              — start a trip whenever.
            </>
          ) : (
            <>
              Pick{" "}
              <span className="font-medium text-foreground">
                {remaining} more
              </span>{" "}
              to start a trip.
            </>
          )}
        </p>
      </div>

      {groups.map((group) => (
        <div key={group.category} className="space-y-3">
          <h3 className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {CATEGORY_LABELS[group.category] ?? group.category}
          </h3>
          <div className="flex flex-wrap gap-2">
            {group.interests.map((interest) => {
              const on = selected.has(interest.id);
              return (
                <button
                  key={interest.id}
                  type="button"
                  onClick={() => toggle(interest.id)}
                  aria-pressed={on}
                  className={cn(
                    "h-9 rounded-full border px-4 text-sm font-medium transition-[color,background-color,border-color,box-shadow] duration-150 ease-out outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
                    on
                      ? "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary/92"
                      : "border-border bg-background text-foreground hover:border-foreground/30 hover:bg-muted/70",
                  )}
                >
                  {interest.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

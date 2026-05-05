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

  return (
    <div className="space-y-6">
      {Array.from(selected).map((id) => (
        <input key={id} type="hidden" name="interest_id" value={id} />
      ))}

      <p className="text-sm text-muted-foreground">
        {selected.size} selected
        {remaining > 0
          ? ` — pick ${remaining} more to start a trip`
          : " — you're ready to start a trip"}
      </p>

      {groups.map((group) => (
        <div key={group.category} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    on
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background hover:bg-muted",
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

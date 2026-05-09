"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  nightlife: "Nightlife",
  fitness: "Fitness",
  culture: "Culture",
  animals: "Animals",
};

const MIN_FOR_TRIP = 5;

export function InterestPicker({
  groups,
  initial,
  onAutoSave,
}: {
  groups: InterestGroup[];
  initial: string[];
  onAutoSave?: (ids: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial));
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingRef = useRef<Set<string>>(new Set(initial));

  const doSave = useCallback(async () => {
    if (!onAutoSave) return;
    const ids = [...pendingRef.current];
    setSaving(true);
    setLastSaved(false);
    try {
      await onAutoSave(ids);
      setLastSaved(true);
      setTimeout(() => setLastSaved(false), 2000);
    } catch {
      // Silently fail — user can still manually save via the form
    } finally {
      setSaving(false);
    }
  }, [onAutoSave]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      pendingRef.current = next;
      return next;
    });

    // Debounce auto-save: wait 1s after last toggle
    if (onAutoSave) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(doSave, 1000);
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

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
          {saving ? (
            <span className="text-muted-foreground">Saving...</span>
          ) : lastSaved ? (
            <span className="font-medium text-primary">Saved!</span>
          ) : ready ? (
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

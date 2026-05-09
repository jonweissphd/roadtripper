"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const RANGE_PRESETS = [
  { label: "Anywhere", start: 0, end: 1 },
  { label: "Early on", start: 0, end: 0.35 },
  { label: "Middle", start: 0.3, end: 0.7 },
  { label: "Late", start: 0.65, end: 1 },
] as const;

export function FindMatchesButton({
  tripId,
  label = "Find our matches",
  isExplore = false,
}: {
  tripId: string;
  label?: string;
  isExplore?: boolean;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rangeIdx, setRangeIdx] = useState(0);
  const router = useRouter();

  async function run() {
    setIsLoading(true);
    setError(null);
    const range = RANGE_PRESETS[rangeIdx];
    try {
      const res = await fetch(`/api/trips/${tripId}/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routeStart: range.start,
          routeEnd: range.end,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        reason?: string;
      };
      if (!res.ok) {
        if (res.status === 504) {
          throw new Error(
            "Search timed out — this can happen on the free hosting tier. Try again or run locally.",
          );
        }
        throw new Error(data.error ?? `Failed to compute matches (${res.status})`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {!isExplore && (
        <div className="flex flex-wrap gap-1.5">
          {RANGE_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setRangeIdx(i)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                i === rangeIdx
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}
      <Button type="button" onClick={run} disabled={isLoading}>
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="relative inline-flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-current" />
            </span>
            {isExplore ? "Searching nearby…" : "Scanning route…"}
          </span>
        ) : (
          label
        )}
      </Button>
      {isLoading && (
        <p className="text-xs text-muted-foreground">
          {isExplore
            ? "Takes 5–15 seconds. We're searching for the best things nearby and ranking them."
            : "Takes 5–15 seconds. We're scanning the corridor, finding places, and ranking them."}
        </p>
      )}
      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

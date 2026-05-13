"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

const RANGE_PRESETS = [
  { label: "Anywhere", start: 0, end: 1 },
  { label: "Early on", start: 0, end: 0.35 },
  { label: "Middle", start: 0.3, end: 0.7 },
  { label: "Late", start: 0.65, end: 1 },
] as const;

const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 48; // 48 × 2.5s = 2 min max wait

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
  const [elapsed, setElapsed] = useState(0);
  const [rangeIdx, setRangeIdx] = useState(0);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined);

  function startTimer() {
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }

  async function pollForCompletion(): Promise<void> {
    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      const res = await fetch(`/api/trips/${tripId}/match`);
      const data = (await res.json().catch(() => ({}))) as {
        status?: string;
        error?: string;
      };

      if (data.status === "done") return;
      if (data.status === "error") {
        throw new Error(data.error ?? "Match computation failed");
      }
      // status === "computing" — keep polling
    }
    throw new Error("Match computation timed out. Please try again.");
  }

  async function run() {
    setIsLoading(true);
    setError(null);
    startTimer();
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
        status?: string;
        error?: string;
        reason?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Failed to compute matches (${res.status})`);
      }

      // If the server is computing in background, poll until done.
      if (data.status === "computing") {
        await pollForCompletion();
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      stopTimer();
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
            {elapsed > 0 && (
              <span className="tabular-nums text-xs opacity-70">({elapsed}s)</span>
            )}
          </span>
        ) : (
          label
        )}
      </Button>
      {isLoading && (
        <p className="text-xs text-muted-foreground">
          {elapsed < 5
            ? "Starting search…"
            : elapsed < 15
              ? isExplore
                ? "Searching for the best things nearby and ranking them…"
                : "Scanning the corridor, finding places, and ranking them…"
              : "Still working — this can take up to a minute on long routes…"}
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

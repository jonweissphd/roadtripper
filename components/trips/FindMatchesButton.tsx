"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function FindMatchesButton({
  tripId,
  label = "Find our matches",
}: {
  tripId: string;
  label?: string;
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function run() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/match`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        reason?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to compute matches");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" onClick={run} disabled={isLoading}>
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="relative inline-flex size-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-current opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-current" />
            </span>
            Scanning route…
          </span>
        ) : (
          label
        )}
      </Button>
      {isLoading && (
        <p className="text-xs text-muted-foreground">
          Takes 5–15 seconds. We&apos;re scanning the corridor, finding places,
          and ranking them.
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

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
        {isLoading ? "Finding matches…" : label}
      </Button>
      {isLoading && (
        <p className="text-xs text-muted-foreground">
          This takes 5–15 seconds — we&apos;re scanning the route, finding
          places, and ranking them.
        </p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/trips/AddressAutocomplete";
import { cn } from "@/lib/utils";
import { createTrip } from "./actions";
import { createExplore } from "@/app/(app)/explore/new/actions";

type Mode = "roadtrip" | "explore";

export function NewTripForm({
  error,
  initialMode = "roadtrip",
}: {
  error?: string;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div className="space-y-8">
      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMode("roadtrip")}
          className={cn(
            "flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            mode === "roadtrip"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          🚗 Road trip
        </button>
        <button
          type="button"
          onClick={() => setMode("explore")}
          className={cn(
            "flex-1 rounded-md px-4 py-2.5 text-sm font-medium transition-colors",
            mode === "explore"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          📍 Explore area
        </button>
      </div>

      {mode === "roadtrip" ? (
        <form action={createTrip} className="space-y-8">
          <p className="text-sm text-muted-foreground">
            Enter your start and destination. We&apos;ll find the best stops
            along the way.
          </p>
          <AddressAutocomplete name="origin" label="Starting from" />
          <AddressAutocomplete name="dest" label="Driving to" />

          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="pt-3">
            <Button type="submit" size="lg" className="text-[0.9375rem] sm:px-8">
              Find stops along the way
            </Button>
          </div>
        </form>
      ) : (
        <form action={createExplore} className="space-y-8">
          <p className="text-sm text-muted-foreground">
            Enter a city, zip code, or neighborhood. We&apos;ll find the best
            things nearby based on your interests.
          </p>
          <AddressAutocomplete name="location" label="City, zip, or neighborhood" />

          {error && (
            <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="pt-3">
            <Button type="submit" size="lg" className="text-[0.9375rem] sm:px-8">
              Explore this area
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

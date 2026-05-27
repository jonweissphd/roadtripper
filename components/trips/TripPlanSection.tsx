"use client";

import { useState } from "react";
import { AddressAutocomplete } from "@/components/trips/AddressAutocomplete";
import { Eyebrow } from "@/components/ui/eyebrow";
import { cn } from "@/lib/utils";

type Mode = "roadtrip" | "explore";

export function TripPlanSection() {
  const [mode, setMode] = useState<Mode>("roadtrip");

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <Eyebrow>Plan a trip</Eyebrow>
        <h2 className="text-xl font-bold tracking-tight">
          Where to next?
        </h2>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMode("roadtrip")}
          className={cn(
            "flex-1 rounded-md px-4 py-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] transition-colors",
            mode === "roadtrip"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Road trip
        </button>
        <button
          type="button"
          onClick={() => setMode("explore")}
          className={cn(
            "flex-1 rounded-md px-4 py-2.5 text-[0.75rem] font-semibold uppercase tracking-[0.1em] transition-colors",
            mode === "explore"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Explore area
        </button>
      </div>

      {/* Hidden field so the server action knows which mode we're in. */}
      <input type="hidden" name="trip_mode" value={mode} />

      {mode === "roadtrip" ? (
        <div className="space-y-5">
          <AddressAutocomplete name="origin" label="Starting from" />
          <AddressAutocomplete name="dest" label="Driving to" />
        </div>
      ) : (
        <AddressAutocomplete name="origin" label="City, zip, or neighborhood" />
      )}
    </section>
  );
}

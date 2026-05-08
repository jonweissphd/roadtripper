"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

let loadPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise<void>((resolve, reject) => {
    if (typeof google !== "undefined" && google.maps?.places) {
      resolve();
      return;
    }
    // Check if script tag already exists (e.g. from TripMap on a previous page).
    const existing = document.querySelector(
      'script[src*="maps.googleapis.com/maps/api/js"]',
    );
    if (existing) {
      const check = () => {
        if (typeof google !== "undefined" && google.maps?.places) resolve();
        else setTimeout(check, 50);
      };
      check();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&v=weekly`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Google Maps JavaScript API could not load."));
    document.head.appendChild(script);
  });
  return loadPromise;
}

export type AddressSelection = {
  address: string;
  lat: number;
  lng: number;
  place_id: string;
};

export function AddressAutocomplete({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: AddressSelection;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selection, setSelection] = useState<AddressSelection | undefined>(
    defaultValue,
  );
  const [error, setError] = useState<string | null>(
    MAPS_KEY
      ? null
      : "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY is not set. Add it to .env.local.",
  );

  useEffect(() => {
    if (!MAPS_KEY || !inputRef.current) return;

    let canceled = false;
    let autocomplete: google.maps.places.Autocomplete | null = null;

    loadGoogleMaps()
      .then(() => {
        if (canceled || !inputRef.current) return;

        autocomplete = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            fields: ["formatted_address", "geometry", "place_id"],
            types: ["geocode", "establishment"],
          },
        );

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete!.getPlace();
          if (!place.geometry?.location) return;
          if (canceled) return;

          const address = place.formatted_address ?? "";
          if (inputRef.current) inputRef.current.value = address;

          setSelection({
            address,
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
            place_id: place.place_id ?? "",
          });
        });

        // Handle Enter key to select first result
        inputRef.current.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && autocomplete) {
            e.preventDefault();
            // Trigger selection of the first prediction
            const predictions = document.querySelectorAll(
              ".pac-item:first-child",
            );
            if (predictions.length > 0) {
              (predictions[0] as HTMLElement).click();
            }
          }
        });
      })
      .catch((err: unknown) => {
        if (!canceled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      canceled = true;
    };
  }, []);

  return (
    <div className="space-y-2">
      <label htmlFor={`${name}-input`} className="text-sm font-medium leading-none">
        {label}
      </label>
      <input
        ref={inputRef}
        id={`${name}-input`}
        type="text"
        placeholder={`Search for ${label.toLowerCase()}`}
        defaultValue={defaultValue?.address}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm",
          "placeholder:text-muted-foreground/60",
          "outline-none transition-colors",
          "focus:border-ring focus:ring-[3px] focus:ring-ring/40",
        )}
        autoComplete="off"
      />
      {selection?.address && (
        <p className="text-xs text-muted-foreground">{selection.address}</p>
      )}
      <input
        type="hidden"
        name={`${name}_address`}
        value={selection?.address ?? ""}
      />
      <input type="hidden" name={`${name}_lat`} value={selection?.lat ?? ""} />
      <input type="hidden" name={`${name}_lng`} value={selection?.lng ?? ""} />
      <input
        type="hidden"
        name={`${name}_place_id`}
        value={selection?.place_id ?? ""}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

let mapsPromise: Promise<void> | null = null;

function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.google?.maps?.places) return Promise.resolve();
  if (mapsPromise) return mapsPromise;

  mapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(
      "gmaps-loader",
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Maps")),
      );
      return;
    }
    const script = document.createElement("script");
    script.id = "gmaps-loader";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&libraries=places&v=weekly&loading=async`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      mapsPromise = null;
      reject(new Error("Failed to load Google Maps"));
    };
    document.head.appendChild(script);
  });
  return mapsPromise;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<AddressSelection | undefined>(
    defaultValue,
  );
  const [error, setError] = useState<string | null>(
    MAPS_KEY
      ? null
      : "NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY is not set. Add it to .env.local.",
  );

  useEffect(() => {
    if (!MAPS_KEY) return;

    const container = containerRef.current;
    if (!container) return;

    let canceled = false;
    let element: google.maps.places.PlaceAutocompleteElement | null = null;

    loadGoogleMaps()
      .then(async () => {
        if (canceled) return;
        await google.maps.importLibrary("places");
        if (canceled) return;

        element = new google.maps.places.PlaceAutocompleteElement({});
        element.style.width = "100%";
        container.appendChild(element);

        element.addEventListener("gmp-select", async (event) => {
          const placePrediction = event.placePrediction;
          if (!placePrediction) return;
          const place = placePrediction.toPlace();
          await place.fetchFields({
            fields: ["formattedAddress", "location", "id"],
          });
          if (canceled) return;
          setSelection({
            address: place.formattedAddress ?? "",
            lat: place.location?.lat() ?? 0,
            lng: place.location?.lng() ?? 0,
            place_id: place.id ?? "",
          });
        });
      })
      .catch((err: unknown) => {
        if (!canceled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      });

    return () => {
      canceled = true;
      if (element && container.contains(element)) {
        container.removeChild(element);
      }
    };
  }, []);

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium leading-none">{label}</label>
      <div ref={containerRef} className="w-full" />
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

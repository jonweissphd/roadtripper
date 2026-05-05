"use client";

import { useEffect, useRef, useState } from "react";

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY;

let bootstrapped = false;

// Google's official async bootstrap loader. Sets up google.maps.importLibrary
// before any maps script is fetched, so dynamic library loading works.
// https://developers.google.com/maps/documentation/javascript/load-maps-js-api
function bootstrapGoogleMaps() {
  if (bootstrapped) return;
  bootstrapped = true;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ((g: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const goog = (w.google = w.google || {});
    const maps = (goog.maps = goog.maps || {});
    const libs = new Set<string>();
    const params = new URLSearchParams();
    let loaderPromise: Promise<void> | null = null;
    const start = () =>
      loaderPromise ||
      (loaderPromise = new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        params.set("libraries", [...libs].join(","));
        for (const k in g) {
          params.set(
            k.replace(/[A-Z]/g, (t) => "_" + t[0].toLowerCase()),
            g[k],
          );
        }
        params.set("callback", "google.maps.__ib__");
        s.src = `https://maps.googleapis.com/maps/api/js?${params}`;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (maps as any).__ib__ = resolve;
        s.onerror = () =>
          reject(new Error("Google Maps JavaScript API could not load."));
        document.head.appendChild(s);
      }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    maps.importLibrary = (name: string, ...rest: any[]) => {
      libs.add(name);
      return start().then(() => maps.importLibrary(name, ...rest));
    };
  })({ key: MAPS_KEY, v: "weekly" });
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

    bootstrapGoogleMaps();
    google.maps
      .importLibrary("places")
      .then(() => {
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
    <div className="space-y-2.5">
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

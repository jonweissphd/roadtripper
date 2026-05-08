"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type Prediction = {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
};

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
  const dropdownRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState(defaultValue?.address ?? "");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [selection, setSelection] = useState<AddressSelection | undefined>(
    defaultValue,
  );
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Fetch predictions from our server-side API.
  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      setOpen(false);
      return;
    }
    try {
      const res = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(input)}`,
      );
      const data = (await res.json()) as { predictions: Prediction[] };
      setPredictions(data.predictions ?? []);
      setOpen((data.predictions ?? []).length > 0);
      setActiveIdx(-1);
    } catch {
      setPredictions([]);
    }
  }, []);

  // Debounce typing.
  const handleInput = useCallback(
    (value: string) => {
      setQuery(value);
      setSelection(undefined); // Clear selection when typing
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => fetchPredictions(value), 250);
    },
    [fetchPredictions],
  );

  // Select a prediction — geocode it to get lat/lng.
  const selectPrediction = useCallback(
    async (prediction: Prediction) => {
      setQuery(prediction.description);
      setPredictions([]);
      setOpen(false);
      setLoading(true);

      try {
        // Use Google Geocoding via our place details API.
        const res = await fetch(
          `/api/places/autocomplete/geocode?place_id=${encodeURIComponent(prediction.place_id)}`,
        );
        const data = (await res.json()) as {
          lat?: number;
          lng?: number;
          formatted_address?: string;
        };
        if (data.lat != null && data.lng != null) {
          const address = data.formatted_address ?? prediction.description;
          setQuery(address);
          setSelection({
            address,
            lat: data.lat,
            lng: data.lng,
            place_id: prediction.place_id,
          });
        }
      } catch {
        // Fallback: use the prediction text without coordinates.
        // The form validation will catch missing lat/lng.
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Keyboard navigation.
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!open || predictions.length === 0) {
        if (e.key === "Enter" && !selection) {
          e.preventDefault(); // Don't submit form without a selection
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIdx((prev) =>
            prev < predictions.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIdx((prev) =>
            prev > 0 ? prev - 1 : predictions.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (activeIdx >= 0 && activeIdx < predictions.length) {
            selectPrediction(predictions[activeIdx]);
          } else if (predictions.length > 0) {
            selectPrediction(predictions[0]);
          }
          break;
        case "Escape":
          setOpen(false);
          break;
      }
    },
    [open, predictions, activeIdx, selectPrediction, selection],
  );

  // Close dropdown on outside click.
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div className="relative space-y-2">
      <label
        htmlFor={`${name}-input`}
        className="text-sm font-medium leading-none"
      >
        {label}
      </label>
      <input
        ref={inputRef}
        id={`${name}-input`}
        type="text"
        placeholder={`Search for ${label.toLowerCase()}`}
        value={query}
        onChange={(e) => handleInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (predictions.length > 0) setOpen(true);
        }}
        className={cn(
          "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm",
          "placeholder:text-muted-foreground/60",
          "outline-none transition-colors",
          "focus:border-ring focus:ring-[3px] focus:ring-ring/40",
        )}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={`${name}-listbox`}
        aria-activedescendant={
          activeIdx >= 0 ? `${name}-option-${activeIdx}` : undefined
        }
      />

      {/* Dropdown */}
      {open && predictions.length > 0 && (
        <ul
          ref={dropdownRef}
          id={`${name}-listbox`}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-border bg-background shadow-lg"
        >
          {predictions.map((p, i) => (
            <li
              key={p.place_id}
              id={`${name}-option-${i}`}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={(e) => {
                e.preventDefault(); // Prevent blur before select
                selectPrediction(p);
              }}
              onMouseEnter={() => setActiveIdx(i)}
              className={cn(
                "cursor-pointer px-3 py-2.5 text-sm transition-colors",
                i === activeIdx ? "bg-muted" : "hover:bg-muted/50",
              )}
            >
              <span className="font-medium">{p.main_text}</span>
              {p.secondary_text && (
                <span className="ml-1 text-muted-foreground">
                  {p.secondary_text}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {loading && (
        <p className="text-xs text-muted-foreground">Looking up location...</p>
      )}
      {selection?.address && !loading && (
        <p className="text-xs text-muted-foreground">{selection.address}</p>
      )}

      {/* Hidden form fields */}
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
    </div>
  );
}

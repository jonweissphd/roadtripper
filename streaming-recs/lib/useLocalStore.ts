"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * useState backed by localStorage. The taste list and platform toggles live
 * here — no account, no server, private to the device. SSR-safe: starts from the
 * provided initial value and hydrates from storage after mount.
 */
export function useLocalStore<T>(
  key: string,
  initial: T,
): [T, (updater: T | ((prev: T) => T)) => void, boolean] {
  const [value, setValue] = useState<T>(initial);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      // Corrupt/unavailable storage — fall back to the initial value.
    }
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (updater: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const next =
          typeof updater === "function"
            ? (updater as (p: T) => T)(prev)
            : updater;
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // Ignore quota/availability errors.
        }
        return next;
      });
    },
    [key],
  );

  return [value, update, hydrated];
}

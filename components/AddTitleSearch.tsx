"use client";

import { useEffect, useRef, useState } from "react";
import type { SearchResult } from "@/lib/types";
import { posterUrl } from "@/lib/img";

export function AddTitleSearch({
  onAdd,
  isAdded,
}: {
  onAdd: (r: SearchResult) => void;
  isAdded: (mediaType: SearchResult["mediaType"], id: number) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/tmdb/search?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        });
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        /* aborted or failed */
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={boxRef} className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Search a movie or show to add…"
        className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none placeholder:text-neutral-500 focus:border-neutral-500"
      />
      {open && (results.length > 0 || loading) && (
        <div className="absolute z-20 mt-1 max-h-96 w-full overflow-auto rounded-lg border border-neutral-700 bg-neutral-900 shadow-xl">
          {loading && (
            <div className="px-3 py-2 text-xs text-neutral-500">Searching…</div>
          )}
          {results.map((r) => {
            const added = isAdded(r.mediaType, r.id);
            const poster = posterUrl(r.posterPath, "w92");
            return (
              <button
                key={`${r.mediaType}:${r.id}`}
                type="button"
                disabled={added}
                onClick={() => {
                  onAdd(r);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-neutral-800 disabled:opacity-40"
              >
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poster}
                    alt=""
                    className="h-12 w-8 flex-none rounded object-cover"
                  />
                ) : (
                  <div className="h-12 w-8 flex-none rounded bg-neutral-800" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{r.title}</span>
                  <span className="block text-xs text-neutral-500">
                    {r.mediaType === "tv" ? "TV" : "Movie"}
                    {r.year ? ` · ${r.year}` : ""}
                    {added ? " · already added" : ""}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

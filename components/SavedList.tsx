"use client";

import type { MediaType, SavedItem } from "@/lib/types";
import { posterUrl } from "@/lib/img";

export function SavedList({
  items,
  onRemove,
  onOpenTrailer,
}: {
  items: SavedItem[];
  onRemove: (mediaType: MediaType, id: number) => void;
  onOpenTrailer: (item: SavedItem) => void;
}) {
  return (
    <div>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Watchlist{items.length > 0 ? ` · ${items.length}` : ""}
      </h2>
      <p className="mb-2 text-xs text-neutral-500">
        Saved by swiping right. Doesn&apos;t affect your taste — just things to
        watch.
      </p>
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-neutral-800 px-3 py-4 text-center text-xs text-neutral-500">
          Nothing saved yet. Swipe right on a pick to save it here.
        </p>
      ) : (
        <ul className="space-y-2">
          {[...items]
            .sort((a, b) => b.addedAt - a.addedAt)
            .map((s) => {
              const poster = posterUrl(s.posterPath, "w92");
              return (
                <li
                  key={`${s.mediaType}:${s.id}`}
                  className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-2"
                >
                  {poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={poster}
                      alt=""
                      className="h-14 w-10 flex-none rounded object-cover"
                    />
                  ) : (
                    <div className="h-14 w-10 flex-none rounded bg-neutral-800" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{s.title}</div>
                    <div className="text-xs text-neutral-500">
                      {s.mediaType === "tv" ? "TV" : "Movie"}
                      {s.year ? ` · ${s.year}` : ""}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenTrailer(s)}
                    title="Watch trailer"
                    className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:text-white"
                  >
                    ▶
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(s.mediaType, s.id)}
                    title="Remove"
                    className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:text-red-400"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
        </ul>
      )}
    </div>
  );
}

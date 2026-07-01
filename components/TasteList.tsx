"use client";

import type { Favorite } from "@/lib/types";
import { posterUrl } from "@/lib/img";

export function TasteList({
  favorites,
  onRemove,
  onToggleSuper,
}: {
  favorites: Favorite[];
  onRemove: (mediaType: Favorite["mediaType"], id: number) => void;
  onToggleSuper: (mediaType: Favorite["mediaType"], id: number) => void;
}) {
  if (favorites.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-800 px-3 py-6 text-center text-sm text-neutral-500">
        Your taste list is empty. Add a few things you love — the more you add,
        the sharper your recommendations get.
      </p>
    );
  }

  // Super-likes first, then most recently added.
  const sorted = [...favorites].sort(
    (a, b) => Number(b.superLike) - Number(a.superLike) || b.addedAt - a.addedAt,
  );

  return (
    <ul className="space-y-2">
      {sorted.map((f) => {
        const poster = posterUrl(f.posterPath, "w92");
        return (
          <li
            key={`${f.mediaType}:${f.id}`}
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
              <div className="truncate text-sm font-medium">{f.title}</div>
              <div className="text-xs text-neutral-500">
                {f.mediaType === "tv" ? "TV" : "Movie"}
                {f.year ? ` · ${f.year}` : ""}
                {f.superLike ? " · super-liked" : ""}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onToggleSuper(f.mediaType, f.id)}
              aria-pressed={f.superLike}
              title={f.superLike ? "Remove super-like" : "Super-like (loved it!)"}
              className={
                "rounded-md px-2 py-1 text-lg leading-none transition " +
                (f.superLike
                  ? "text-amber-400"
                  : "text-neutral-600 hover:text-neutral-300")
              }
            >
              {f.superLike ? "★" : "☆"}
            </button>
            <button
              type="button"
              onClick={() => onRemove(f.mediaType, f.id)}
              title="Remove"
              className="rounded-md px-2 py-1 text-sm text-neutral-600 hover:text-red-400"
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}

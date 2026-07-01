"use client";

import type { MediaType, SavedItem } from "@/lib/types";
import { posterUrl } from "@/lib/img";
import { SwipeStack } from "@/components/SwipeStack";

export function AuditDeck({
  items,
  disabled = false,
  onRemove,
  onLoved,
  onOpenTrailer,
}: {
  items: SavedItem[];
  disabled?: boolean;
  /** Discard from the watchlist. */
  onRemove: (mediaType: MediaType, id: number) => void;
  /** "Watched & loved it" — promote to the taste list and clear from watchlist. */
  onLoved: (s: SavedItem) => void;
  onOpenTrailer: (s: SavedItem) => void;
}) {
  return (
    <SwipeStack<SavedItem>
      items={items}
      getKey={(s) => `${s.mediaType}:${s.id}`}
      disabled={disabled}
      title="Audit your watchlist"
      hint="← 🗑 remove · ↑ ★ loved it → taste · → ✓ keep"
      emptyText="Your watchlist is empty. Swipe right on recommendations to save titles here."
      left={{ label: "REMOVE", icon: "🗑" }}
      up={{ label: "LOVED", icon: "★" }}
      right={{ label: "KEEP", icon: "✓" }}
      onLeft={(s) => onRemove(s.mediaType, s.id)}
      onUp={(s) => onLoved(s)}
      onRight={() => {
        /* keep: no state change, just advance past it */
      }}
      renderCard={(s, isTop) => (
        <SavedCard item={s} isTop={isTop} onOpenTrailer={onOpenTrailer} />
      )}
    />
  );
}

function SavedCard({
  item,
  isTop,
  onOpenTrailer,
}: {
  item: SavedItem;
  isTop: boolean;
  onOpenTrailer: (s: SavedItem) => void;
}) {
  const poster = posterUrl(item.posterPath, "w342");
  return (
    <>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={item.title}
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-neutral-800 p-6 text-center text-neutral-400">
          {item.title}
        </div>
      )}

      {isTop && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpenTrailer(item)}
          className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/80"
        >
          ▶ Trailer
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4">
        <div className="text-lg font-semibold leading-tight">{item.title}</div>
        <div className="text-xs text-neutral-300">
          {item.mediaType === "tv" ? "TV" : "Movie"}
          {item.year ? ` · ${item.year}` : ""}
        </div>
      </div>
    </>
  );
}

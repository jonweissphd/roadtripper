"use client";

import type { MediaType, Recommendation } from "@/lib/types";
import { platformName } from "@/lib/platforms";
import { posterUrl } from "@/lib/img";
import { SwipeStack } from "@/components/SwipeStack";

export function SwipeDeck({
  items,
  loading,
  note,
  disabled = false,
  onSave,
  onSuperLike,
  onNope,
  onOpenTrailer,
}: {
  items: Recommendation[];
  loading: boolean;
  note?: string;
  disabled?: boolean;
  onSave: (r: Recommendation) => void;
  onSuperLike: (r: Recommendation) => void;
  onNope: (mediaType: MediaType, id: number) => void;
  onOpenTrailer: (r: Recommendation) => void;
}) {
  return (
    <SwipeStack<Recommendation>
      items={items}
      getKey={(r) => `${r.mediaType}:${r.id}`}
      loading={loading}
      note={note}
      disabled={disabled}
      title="Swipe your picks"
      hint="← ✕ nope · ↑ ★ super-like · → 🔖 save"
      emptyText="You're all caught up. Add more favorites for more picks."
      left={{ label: "NOPE", icon: "✕" }}
      up={{ label: "SUPER", icon: "★" }}
      right={{ label: "SAVE", icon: "🔖" }}
      onLeft={(r) => onNope(r.mediaType, r.id)}
      onUp={(r) => onSuperLike(r)}
      onRight={(r) => onSave(r)}
      renderCard={(r, isTop) => (
        <RecCard rec={r} isTop={isTop} onOpenTrailer={onOpenTrailer} />
      )}
    />
  );
}

function RecCard({
  rec,
  isTop,
  onOpenTrailer,
}: {
  rec: Recommendation;
  isTop: boolean;
  onOpenTrailer: (r: Recommendation) => void;
}) {
  const poster = posterUrl(rec.posterPath, "w342");
  return (
    <>
      {poster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={poster}
          alt={rec.title}
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-neutral-800 p-6 text-center text-neutral-400">
          {rec.title}
        </div>
      )}

      {isTop && (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onOpenTrailer(rec)}
          className="absolute right-3 top-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur hover:bg-black/80"
        >
          ▶ Trailer
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4">
        <div className="text-lg font-semibold leading-tight">{rec.title}</div>
        <div className="text-xs text-neutral-300">
          {rec.mediaType === "tv" ? "TV" : "Movie"}
          {rec.year ? ` · ${rec.year}` : ""}
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {rec.availableOn.map((pid) => (
            <span
              key={pid}
              className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[11px] text-emerald-200"
            >
              {platformName(pid)}
            </span>
          ))}
        </div>
        {rec.becauseOf.length > 0 && (
          <div className="mt-1 text-[11px] text-neutral-400">
            Because you liked {rec.becauseOf.join(", ")}
          </div>
        )}
      </div>
    </>
  );
}

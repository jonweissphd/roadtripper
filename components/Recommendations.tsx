"use client";

import type { MediaType, Recommendation } from "@/lib/types";
import { platformName } from "@/lib/platforms";
import { posterUrl } from "@/lib/img";

export function Recommendations({
  items,
  loading,
  note,
  onHide,
  onAddFavorite,
  onSave,
  onOpenTrailer,
}: {
  items: Recommendation[];
  loading: boolean;
  note?: string;
  onHide: (mediaType: MediaType, id: number) => void;
  onAddFavorite: (r: Recommendation) => void;
  onSave: (r: Recommendation) => void;
  onOpenTrailer: (r: Recommendation) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recommended for you</h2>
        {loading && (
          <span className="text-xs text-neutral-500">updating…</span>
        )}
      </div>

      {note && (
        <p className="mt-3 rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
          {note}
        </p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((r) => {
          const poster = posterUrl(r.posterPath, "w342");
          return (
            <div
              key={`${r.mediaType}:${r.id}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900"
            >
              <div className="relative aspect-[2/3] bg-neutral-800">
                {poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={poster}
                    alt={r.title}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-xs text-neutral-500">
                    {r.title}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onHide(r.mediaType, r.id)}
                  title="Not interested"
                  className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-neutral-300 opacity-0 transition group-hover:opacity-100 hover:text-white"
                >
                  Hide
                </button>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-3">
                <div>
                  <div className="text-sm font-medium leading-tight">
                    {r.title}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {r.mediaType === "tv" ? "TV" : "Movie"}
                    {r.year ? ` · ${r.year}` : ""}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {r.availableOn.map((pid) => (
                    <span
                      key={pid}
                      className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[11px] text-emerald-300"
                    >
                      {platformName(pid)}
                    </span>
                  ))}
                </div>

                {r.becauseOf.length > 0 && (
                  <div className="text-[11px] leading-snug text-neutral-500">
                    Because you liked {r.becauseOf.join(", ")}
                  </div>
                )}

                <div className="mt-auto flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSave(r)}
                    className="flex-1 rounded-md border border-emerald-500/40 px-2 py-1 text-xs text-emerald-300 transition hover:bg-emerald-500/10"
                  >
                    🔖 Save
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenTrailer(r)}
                    className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white"
                  >
                    ▶ Trailer
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddFavorite(r)}
                    title="Add to taste list (a strong signal that shapes recs)"
                    className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 transition hover:border-neutral-500 hover:text-white"
                  >
                    ★ Taste
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && !note && items.length === 0 && (
        <p className="mt-4 text-sm text-neutral-500">No recommendations yet.</p>
      )}
    </div>
  );
}

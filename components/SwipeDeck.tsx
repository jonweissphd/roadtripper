"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MediaType, Recommendation } from "@/lib/types";
import { platformName } from "@/lib/platforms";
import { posterUrl } from "@/lib/img";

type Dir = "save" | "nope" | "super";

// Past this horizontal/vertical drag (px) a release commits the swipe.
const THRESHOLD = 110;
// How long the fly-off animation runs before the card is removed.
const FLY_MS = 320;

function keyOf(r: Recommendation): string {
  return `${r.mediaType}:${r.id}`;
}

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
  /** When true (e.g. a modal is open), ignore swipe/keyboard input. */
  disabled?: boolean;
  onSave: (r: Recommendation) => void;
  onSuperLike: (r: Recommendation) => void;
  onNope: (mediaType: MediaType, id: number) => void;
  onOpenTrailer: (r: Recommendation) => void;
}) {
  const [queue, setQueue] = useState<Recommendation[]>([]);
  const acted = useRef<Set<string>>(new Set());
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  // Merge freshly computed recs into the working queue without disturbing the
  // cards already in front of the user. New picks (from a growing taste list)
  // simply get appended; anything already swiped this session is skipped.
  useEffect(() => {
    setQueue((prev) => {
      const known = new Set(prev.map(keyOf));
      const additions = items.filter(
        (it) => !known.has(keyOf(it)) && !acted.current.has(keyOf(it)),
      );
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [items]);

  const top = queue[0];

  const commit = useCallback(
    (dir: Dir) => {
      if (!top || leaving) return;
      const target =
        dir === "save"
          ? { x: 1100, y: 40 }
          : dir === "nope"
            ? { x: -1100, y: 40 }
            : { x: 0, y: -1100 };
      setLeaving(target);
      const card = top;
      acted.current.add(keyOf(card));
      window.setTimeout(() => {
        if (dir === "save") onSave(card);
        else if (dir === "super") onSuperLike(card);
        else onNope(card.mediaType, card.id);
        setQueue((prev) => prev.slice(1));
        setLeaving(null);
        setDrag({ x: 0, y: 0, active: false });
      }, FLY_MS);
    },
    [top, leaving, onSave, onSuperLike, onNope],
  );

  // Keyboard: ← nope, → save, ↑ super-like.
  useEffect(() => {
    if (disabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") commit("nope");
      else if (e.key === "ArrowRight") commit("save");
      else if (e.key === "ArrowUp") commit("super");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, disabled]);

  function onPointerDown(e: React.PointerEvent) {
    if (leaving || disabled) return;
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!start.current || leaving) return;
    setDrag({
      x: e.clientX - start.current.x,
      y: e.clientY - start.current.y,
      active: true,
    });
  }
  function onPointerUp() {
    if (!start.current || leaving) return;
    start.current = null;
    const { x, y } = drag;
    if (y < -THRESHOLD && Math.abs(x) < THRESHOLD * 1.2) commit("super");
    else if (x > THRESHOLD) commit("save");
    else if (x < -THRESHOLD) commit("nope");
    else setDrag({ x: 0, y: 0, active: false });
  }

  const saveOp = Math.max(0, Math.min(1, drag.x / THRESHOLD));
  const nopeOp = Math.max(0, Math.min(1, -drag.x / THRESHOLD));
  const superOp = Math.max(0, Math.min(1, -drag.y / THRESHOLD));

  const empty = queue.length === 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Swipe your picks</h2>
        {loading && <span className="text-xs text-neutral-500">updating…</span>}
      </div>

      {note && empty && (
        <p className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
          {note}
        </p>
      )}

      <div className="relative mx-auto h-[560px] w-full max-w-sm select-none">
        {empty && !note && (
          <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-neutral-800 px-6 text-center text-sm text-neutral-500">
            {loading
              ? "Finding picks…"
              : "You're all caught up. Add more favorites for more picks."}
          </div>
        )}

        {queue
          .slice(0, 3)
          .map((rec, i) => {
            const isTop = i === 0;
            const poster = posterUrl(rec.posterPath, "w342");
            const transform = isTop
              ? leaving
                ? `translate(${leaving.x}px, ${leaving.y}px) rotate(${leaving.x / 18}deg)`
                : `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 22}deg)`
              : `scale(${1 - i * 0.04}) translateY(${i * 14}px)`;
            const transition =
              isTop && drag.active ? "none" : `transform ${FLY_MS}ms ease`;
            return (
              <div
                key={keyOf(rec)}
                onPointerDown={isTop ? onPointerDown : undefined}
                onPointerMove={isTop ? onPointerMove : undefined}
                onPointerUp={isTop ? onPointerUp : undefined}
                className="absolute inset-0 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-xl"
                style={{
                  transform,
                  transition,
                  zIndex: 10 - i,
                  cursor: isTop ? "grab" : "default",
                  touchAction: "none",
                }}
              >
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
                  <div className="text-lg font-semibold leading-tight">
                    {rec.title}
                  </div>
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

                {isTop && (
                  <>
                    <Overlay
                      label="SAVE"
                      className="left-4 top-4 -rotate-12 border-emerald-400 text-emerald-400"
                      opacity={saveOp}
                    />
                    <Overlay
                      label="NOPE"
                      className="right-4 top-4 rotate-12 border-rose-400 text-rose-400"
                      opacity={nopeOp}
                    />
                    <Overlay
                      label="SUPER"
                      className="left-1/2 top-6 -translate-x-1/2 border-sky-400 text-sky-400"
                      opacity={superOp}
                    />
                  </>
                )}
              </div>
            );
          })
          .reverse()}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <DeckButton
          onClick={() => commit("nope")}
          disabled={empty || !!leaving || disabled}
          title="Not interested (←)"
          className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
        >
          ✕
        </DeckButton>
        <DeckButton
          onClick={() => commit("super")}
          disabled={empty || !!leaving || disabled}
          title="Super-like — add to taste list (↑)"
          className="border-sky-500/40 text-sky-400 hover:bg-sky-500/10"
        >
          ★
        </DeckButton>
        <DeckButton
          onClick={() => commit("save")}
          disabled={empty || !!leaving || disabled}
          title="Save to watchlist (→)"
          className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
        >
          🔖
        </DeckButton>
      </div>
      <p className="mt-3 text-center text-xs text-neutral-600">
        ← ✕ nope · ↑ ★ super-like · → 🔖 save
      </p>
    </div>
  );
}

function Overlay({
  label,
  className,
  opacity,
}: {
  label: string;
  className: string;
  opacity: number;
}) {
  return (
    <div
      className={
        "pointer-events-none absolute rounded-lg border-4 px-3 py-1 text-2xl font-black tracking-wider " +
        className
      }
      style={{ opacity }}
    >
      {label}
    </div>
  );
}

function DeckButton({
  children,
  onClick,
  disabled,
  title,
  className,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  title: string;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={
        "flex h-14 w-14 items-center justify-center rounded-full border bg-neutral-900 text-xl transition disabled:opacity-30 " +
        className
      }
    >
      {children}
    </button>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Past this horizontal/vertical drag (px) a release commits the swipe.
const THRESHOLD = 110;
// How long the fly-off animation runs before the card is removed.
const FLY_MS = 320;

type Dir = "left" | "right" | "up";

export interface DeckAction {
  label: string; // overlay text, e.g. "SAVE"
  icon: string; // button glyph, e.g. "🔖"
}

interface SwipeStackProps<T> {
  items: T[];
  getKey: (item: T) => string;
  /** Inner card content (poster, info, trailer button…). */
  renderCard: (item: T, isTop: boolean) => React.ReactNode;
  onLeft: (item: T) => void;
  onUp: (item: T) => void;
  onRight: (item: T) => void;
  left: DeckAction; // negative action (rose)
  up: DeckAction; // strong action (sky)
  right: DeckAction; // positive action (emerald)
  title: string;
  hint: string;
  emptyText: string;
  loading?: boolean;
  note?: string;
  /** When true (e.g. a modal is open), ignore swipe/keyboard input. */
  disabled?: boolean;
}

export function SwipeStack<T>({
  items,
  getKey,
  renderCard,
  onLeft,
  onUp,
  onRight,
  left,
  up,
  right,
  title,
  hint,
  emptyText,
  loading = false,
  note,
  disabled = false,
}: SwipeStackProps<T>) {
  const [queue, setQueue] = useState<T[]>([]);
  const acted = useRef<Set<string>>(new Set());
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const [leaving, setLeaving] = useState<{ x: number; y: number } | null>(null);
  const startPt = useRef<{ x: number; y: number } | null>(null);

  // Merge incoming items without disturbing cards already in front of the user.
  useEffect(() => {
    setQueue((prev) => {
      const known = new Set(prev.map(getKey));
      const additions = items.filter(
        (it) => !known.has(getKey(it)) && !acted.current.has(getKey(it)),
      );
      return additions.length ? [...prev, ...additions] : prev;
    });
  }, [items, getKey]);

  const top = queue[0];

  const commit = useCallback(
    (dir: Dir) => {
      if (!top || leaving) return;
      const target =
        dir === "right"
          ? { x: 1100, y: 40 }
          : dir === "left"
            ? { x: -1100, y: 40 }
            : { x: 0, y: -1100 };
      setLeaving(target);
      const card = top;
      acted.current.add(getKey(card));
      window.setTimeout(() => {
        if (dir === "right") onRight(card);
        else if (dir === "up") onUp(card);
        else onLeft(card);
        setQueue((prev) => prev.slice(1));
        setLeaving(null);
        setDrag({ x: 0, y: 0, active: false });
      }, FLY_MS);
    },
    [top, leaving, getKey, onRight, onUp, onLeft],
  );

  useEffect(() => {
    if (disabled) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") commit("left");
      else if (e.key === "ArrowRight") commit("right");
      else if (e.key === "ArrowUp") commit("up");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, disabled]);

  function onPointerDown(e: React.PointerEvent) {
    if (leaving || disabled) return;
    startPt.current = { x: e.clientX, y: e.clientY };
    setDrag({ x: 0, y: 0, active: true });
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!startPt.current || leaving) return;
    setDrag({
      x: e.clientX - startPt.current.x,
      y: e.clientY - startPt.current.y,
      active: true,
    });
  }
  function onPointerUp() {
    if (!startPt.current || leaving) return;
    startPt.current = null;
    const { x, y } = drag;
    if (y < -THRESHOLD && Math.abs(x) < THRESHOLD * 1.2) commit("up");
    else if (x > THRESHOLD) commit("right");
    else if (x < -THRESHOLD) commit("left");
    else setDrag({ x: 0, y: 0, active: false });
  }

  const rightOp = Math.max(0, Math.min(1, drag.x / THRESHOLD));
  const leftOp = Math.max(0, Math.min(1, -drag.x / THRESHOLD));
  const upOp = Math.max(0, Math.min(1, -drag.y / THRESHOLD));

  const empty = queue.length === 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
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
            {loading ? "Loading…" : emptyText}
          </div>
        )}

        {queue
          .slice(0, 3)
          .map((item, i) => {
            const isTop = i === 0;
            const transform = isTop
              ? leaving
                ? `translate(${leaving.x}px, ${leaving.y}px) rotate(${leaving.x / 18}deg)`
                : `translate(${drag.x}px, ${drag.y}px) rotate(${drag.x / 22}deg)`
              : `scale(${1 - i * 0.04}) translateY(${i * 14}px)`;
            const transition =
              isTop && drag.active ? "none" : `transform ${FLY_MS}ms ease`;
            return (
              <div
                key={getKey(item)}
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
                {renderCard(item, isTop)}

                {isTop && (
                  <>
                    <Overlay
                      label={right.label}
                      className="left-4 top-4 -rotate-12 border-emerald-400 text-emerald-400"
                      opacity={rightOp}
                    />
                    <Overlay
                      label={left.label}
                      className="right-4 top-4 rotate-12 border-rose-400 text-rose-400"
                      opacity={leftOp}
                    />
                    <Overlay
                      label={up.label}
                      className="left-1/2 top-6 -translate-x-1/2 border-sky-400 text-sky-400"
                      opacity={upOp}
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
          onClick={() => commit("left")}
          disabled={empty || !!leaving || disabled}
          title={left.label}
          className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
        >
          {left.icon}
        </DeckButton>
        <DeckButton
          onClick={() => commit("up")}
          disabled={empty || !!leaving || disabled}
          title={up.label}
          className="border-sky-500/40 text-sky-400 hover:bg-sky-500/10"
        >
          {up.icon}
        </DeckButton>
        <DeckButton
          onClick={() => commit("right")}
          disabled={empty || !!leaving || disabled}
          title={right.label}
          className="border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
        >
          {right.icon}
        </DeckButton>
      </div>
      <p className="mt-3 text-center text-xs text-neutral-600">{hint}</p>
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

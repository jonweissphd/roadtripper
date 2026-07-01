"use client";

import { useEffect, useState } from "react";
import type { MediaType } from "@/lib/types";

export interface TrailerTarget {
  mediaType: MediaType;
  id: number;
  title: string;
}

export function TrailerModal({
  target,
  onClose,
}: {
  target: TrailerTarget | null;
  onClose: () => void;
}) {
  const [state, setState] = useState<
    { status: "loading" } | { status: "ready"; key: string | null }
  >({ status: "loading" });

  useEffect(() => {
    if (!target) return;
    setState({ status: "loading" });
    const ctrl = new AbortController();
    fetch(`/api/tmdb/video?type=${target.mediaType}&id=${target.id}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json())
      .then((d) => setState({ status: "ready", key: d.key ?? null }))
      .catch(() => setState({ status: "ready", key: null }));
    return () => ctrl.abort();
  }, [target]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (target) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target, onClose]);

  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${target.title} trailer`}
    >
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2">
          <span className="truncate text-sm font-medium">{target.title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded px-2 py-1 text-neutral-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        <div className="aspect-video bg-black">
          {state.status === "loading" && (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              Loading trailer…
            </div>
          )}
          {state.status === "ready" && state.key && (
            <iframe
              className="h-full w-full"
              src={`https://www.youtube.com/embed/${state.key}?autoplay=1&rel=0`}
              title={`${target.title} trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
          {state.status === "ready" && !state.key && (
            <div className="flex h-full items-center justify-center text-sm text-neutral-500">
              No trailer available for this title.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

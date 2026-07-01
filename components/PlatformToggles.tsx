"use client";

import { PLATFORMS } from "@/lib/platforms";

export function PlatformToggles({
  enabled,
  onToggle,
}: {
  enabled: number[];
  onToggle: (id: number) => void;
}) {
  const set = new Set(enabled);
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">
        Your services
      </h2>
      <p className="mt-1 text-xs text-neutral-500">
        Recommendations only include titles you can actually stream on these.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PLATFORMS.map((p) => {
          const on = set.has(p.id);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              aria-pressed={on}
              className={
                "rounded-full border px-3 py-1.5 text-sm transition " +
                (on
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-300"
                  : "border-neutral-700 bg-neutral-900 text-neutral-400 hover:border-neutral-500")
              }
            >
              {p.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

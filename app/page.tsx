"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStore } from "@/lib/useLocalStore";
import {
  Favorite,
  favKey,
  MediaType,
  Recommendation,
  RecommendResponse,
  SearchResult,
} from "@/lib/types";
import { PlatformToggles } from "@/components/PlatformToggles";
import { AddTitleSearch } from "@/components/AddTitleSearch";
import { TasteList } from "@/components/TasteList";
import { Recommendations } from "@/components/Recommendations";
import { RegionSelect } from "@/components/RegionSelect";
import { SwipeDeck } from "@/components/SwipeDeck";

// Sensible first-run defaults so the app isn't empty on arrival.
const DEFAULT_PLATFORMS = [8, 15, 337, 1899, 9]; // Netflix, Hulu, Disney+, Max, Prime

export default function Home() {
  const [favorites, setFavorites, favHydrated] = useLocalStore<Favorite[]>(
    "sr:favorites",
    [],
  );
  const [platforms, setPlatforms, platHydrated] = useLocalStore<number[]>(
    "sr:platforms",
    DEFAULT_PLATFORMS,
  );
  const [hidden, setHidden] = useLocalStore<string[]>("sr:hidden", []);
  const [region, setRegion, regionHydrated] = useLocalStore<string>(
    "sr:region",
    "US",
  );

  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [note, setNote] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useLocalStore<"swipe" | "grid">("sr:view", "swipe");

  const hydrated = favHydrated && platHydrated && regionHydrated;

  // --- taste list mutations ------------------------------------------------
  const addFavorite = useCallback(
    (r: SearchResult | Recommendation, superLike = false) => {
      setFavorites((prev) => {
        if (prev.some((f) => f.id === r.id && f.mediaType === r.mediaType)) {
          return prev;
        }
        const fav: Favorite = {
          id: r.id,
          mediaType: r.mediaType,
          title: r.title,
          year: r.year,
          posterPath: r.posterPath,
          superLike,
          addedAt: Date.now(),
        };
        return [...prev, fav];
      });
    },
    [setFavorites],
  );

  const removeFavorite = useCallback(
    (mediaType: MediaType, id: number) => {
      setFavorites((prev) =>
        prev.filter((f) => !(f.id === id && f.mediaType === mediaType)),
      );
    },
    [setFavorites],
  );

  const toggleSuper = useCallback(
    (mediaType: MediaType, id: number) => {
      setFavorites((prev) =>
        prev.map((f) =>
          f.id === id && f.mediaType === mediaType
            ? { ...f, superLike: !f.superLike }
            : f,
        ),
      );
    },
    [setFavorites],
  );

  const togglePlatform = useCallback(
    (id: number) => {
      setPlatforms((prev) =>
        prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
      );
    },
    [setPlatforms],
  );

  const hide = useCallback(
    (mediaType: MediaType, id: number) => {
      setHidden((prev) => {
        const key = favKey(mediaType, id);
        return prev.includes(key) ? prev : [...prev, key];
      });
    },
    [setHidden],
  );

  const isAdded = useCallback(
    (mediaType: MediaType, id: number) =>
      favorites.some((f) => f.id === id && f.mediaType === mediaType),
    [favorites],
  );

  // --- recompute recommendations whenever taste/platforms change -----------
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!hydrated) return;

    if (favorites.length === 0) {
      setRecs([]);
      setNote("Add a few favorites to get recommendations.");
      setLoading(false);
      return;
    }

    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;

    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/tmdb/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ctrl.signal,
          body: JSON.stringify({
            favorites: favorites.map((f) => ({
              id: f.id,
              mediaType: f.mediaType,
              title: f.title,
              superLike: f.superLike,
            })),
            platforms,
            hidden,
            region,
          }),
        });
        const data = (await res.json()) as RecommendResponse & {
          error?: string;
        };
        if (data.error) {
          setRecs([]);
          setNote(data.error);
        } else {
          setRecs(data.recommendations);
          setNote(data.note);
        }
      } catch {
        // aborted — a newer request is in flight
      } finally {
        if (abortRef.current === ctrl) setLoading(false);
      }
    }, 500);

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [favorites, platforms, hidden, region, hydrated]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Streaming Recs</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Build a taste list, super-like the ones you loved, and get picks you
          can actually stream on your services. Everything stays on this device.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,340px)_1fr]">
        <aside className="space-y-6">
          <RegionSelect value={region} onChange={setRegion} />
          <PlatformToggles enabled={platforms} onToggle={togglePlatform} />

          <div>
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">
              Your taste list
            </h2>
            <AddTitleSearch
              onAdd={(r) => addFavorite(r)}
              isAdded={isAdded}
            />
            <div className="mt-3">
              <TasteList
                favorites={favorites}
                onRemove={removeFavorite}
                onToggleSuper={toggleSuper}
              />
            </div>
          </div>
        </aside>

        <section>
          <div className="mb-4 flex justify-end">
            <div className="inline-flex rounded-lg border border-neutral-800 p-0.5 text-sm">
              {(["swipe", "grid"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={
                    "rounded-md px-3 py-1 capitalize transition " +
                    (view === v
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:text-neutral-200")
                  }
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {view === "swipe" ? (
            <SwipeDeck
              items={recs}
              loading={loading}
              note={note}
              onLike={(r) => addFavorite(r, false)}
              onSuperLike={(r) => addFavorite(r, true)}
              onNope={hide}
            />
          ) : (
            <Recommendations
              items={recs}
              loading={loading}
              note={note}
              onHide={hide}
              onAddFavorite={(r) => addFavorite(r)}
            />
          )}
        </section>
      </div>

      <footer className="mt-12 border-t border-neutral-900 pt-4 text-xs text-neutral-600">
        Streaming availability data by JustWatch via TMDb. This product uses the
        TMDb API but is not endorsed or certified by TMDb.
      </footer>
    </main>
  );
}

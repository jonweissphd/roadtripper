// Server-only TMDb client. Never import this from a client component — it reads
// the API credential from the environment. All browser access goes through the
// /api/tmdb/* route handlers instead, so the key is never shipped to the client.

import "server-only";
import type { MediaType, SearchResult } from "./types";

const BASE = "https://api.themoviedb.org/3";

export const REGION = process.env.TMDB_REGION || "US";

function authHeaders(): HeadersInit {
  const token = process.env.TMDB_ACCESS_TOKEN;
  if (token) return { Authorization: `Bearer ${token}`, accept: "application/json" };
  return { accept: "application/json" };
}

function withKey(path: string, params: Record<string, string>): string {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // v3 api_key fallback when no bearer token is configured.
  if (!process.env.TMDB_ACCESS_TOKEN && process.env.TMDB_API_KEY) {
    url.searchParams.set("api_key", process.env.TMDB_API_KEY);
  }
  return url.toString();
}

export function assertConfigured(): void {
  if (!process.env.TMDB_ACCESS_TOKEN && !process.env.TMDB_API_KEY) {
    throw new Error(
      "TMDb is not configured. Set TMDB_ACCESS_TOKEN (preferred) or TMDB_API_KEY in .env.local.",
    );
  }
}

// --- Tiny in-memory cache -------------------------------------------------
// TMDb availability data only refreshes ~daily, and recommendation lists are
// stable, so caching aggressively keeps us well under rate limits and makes the
// live-updating UI feel instant. Process-local; fine for a personal app.
type CacheEntry = { value: unknown; expires: number };
const cache = new Map<string, CacheEntry>();

async function getJSON<T>(url: string, ttlMs: number): Promise<T> {
  const hit = cache.get(url);
  if (hit && hit.expires > Date.now()) return hit.value as T;

  const res = await fetch(url, { headers: authHeaders() });
  if (!res.ok) {
    throw new Error(`TMDb ${res.status} for ${url.replace(/api_key=[^&]+/, "api_key=***")}`);
  }
  const value = (await res.json()) as T;
  cache.set(url, { value, expires: Date.now() + ttlMs });
  return value;
}

const DAY = 24 * 60 * 60 * 1000;

// --- Shapes we consume from TMDb ------------------------------------------
interface TmdbTitle {
  id: number;
  media_type?: string;
  title?: string; // movies
  name?: string; // tv
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  overview?: string;
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
}

function yearOf(t: TmdbTitle): string | null {
  const d = t.release_date || t.first_air_date;
  return d ? d.slice(0, 4) : null;
}

function titleOf(t: TmdbTitle): string {
  return t.title || t.name || "(untitled)";
}

export interface NormalizedTitle {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
}

function normalize(t: TmdbTitle, fallbackType: MediaType): NormalizedTitle {
  const mediaType: MediaType =
    t.media_type === "tv" || t.media_type === "movie"
      ? (t.media_type as MediaType)
      : fallbackType;
  return {
    id: t.id,
    mediaType,
    title: titleOf(t),
    year: yearOf(t),
    posterPath: t.poster_path ?? null,
    overview: t.overview ?? "",
    voteAverage: t.vote_average ?? 0,
    voteCount: t.vote_count ?? 0,
    popularity: t.popularity ?? 0,
  };
}

/** Multi-search across movies + TV for the taste-list add box. */
export async function searchTitles(query: string): Promise<SearchResult[]> {
  const url = withKey("/search/multi", {
    query,
    include_adult: "false",
    language: "en-US",
    page: "1",
  });
  const data = await getJSON<{ results: TmdbTitle[] }>(url, 60 * 60 * 1000);
  return data.results
    .filter((r) => r.media_type === "movie" || r.media_type === "tv")
    .map((r) => {
      const n = normalize(r, "movie");
      return {
        id: n.id,
        mediaType: n.mediaType,
        title: n.title,
        year: n.year,
        posterPath: n.posterPath,
        overview: n.overview,
      } satisfies SearchResult;
    })
    .slice(0, 12);
}

/** TMDb "recommendations" for a title (people who liked X also liked...). */
export async function recommendationsFor(
  mediaType: MediaType,
  id: number,
): Promise<NormalizedTitle[]> {
  const url = withKey(`/${mediaType}/${id}/recommendations`, {
    language: "en-US",
    page: "1",
  });
  try {
    const data = await getJSON<{ results: TmdbTitle[] }>(url, DAY);
    return data.results.map((r) => normalize(r, mediaType));
  } catch {
    return [];
  }
}

/** Content-similar titles for a title. */
export async function similarTo(
  mediaType: MediaType,
  id: number,
): Promise<NormalizedTitle[]> {
  const url = withKey(`/${mediaType}/${id}/similar`, {
    language: "en-US",
    page: "1",
  });
  try {
    const data = await getJSON<{ results: TmdbTitle[] }>(url, DAY);
    return data.results.map((r) => normalize(r, mediaType));
  } catch {
    return [];
  }
}

/**
 * Streaming providers (flatrate = included with subscription) for a title in the
 * configured region. Returns the set of provider ids.
 */
export async function flatrateProviders(
  mediaType: MediaType,
  id: number,
): Promise<number[]> {
  const url = withKey(`/${mediaType}/${id}/watch/providers`, {});
  try {
    const data = await getJSON<{
      results?: Record<string, { flatrate?: Array<{ provider_id: number }> }>;
    }>(url, DAY);
    const region = data.results?.[REGION];
    if (!region?.flatrate) return [];
    return region.flatrate.map((p) => p.provider_id);
  } catch {
    return [];
  }
}

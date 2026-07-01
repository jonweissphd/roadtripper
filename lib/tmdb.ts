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
 * given region. Returns the set of provider ids.
 */
export async function flatrateProviders(
  mediaType: MediaType,
  id: number,
  region: string = REGION,
): Promise<number[]> {
  const url = withKey(`/${mediaType}/${id}/watch/providers`, {});
  try {
    const data = await getJSON<{
      results?: Record<string, { flatrate?: Array<{ provider_id: number }> }>;
    }>(url, DAY);
    const forRegion = data.results?.[region];
    if (!forRegion?.flatrate) return [];
    return forRegion.flatrate.map((p) => p.provider_id);
  } catch {
    return [];
  }
}

// --- Taste "affinity" signals: cast, director/creator, keywords -----------
export interface Person {
  id: number;
  name: string;
  role: "Director" | "Creator" | "Cast";
}
export interface TitleDetails {
  genreIds: number[];
  keywords: Array<{ id: number; name: string }>;
  people: Person[];
}

interface DetailsResponse {
  genres?: Array<{ id: number }>;
  created_by?: Array<{ id: number; name: string }>;
  keywords?: {
    keywords?: Array<{ id: number; name: string }>; // movies
    results?: Array<{ id: number; name: string }>; // tv
  };
  credits?: {
    cast?: Array<{ id: number; name: string }>;
    crew?: Array<{ id: number; name: string; job: string }>;
  };
}

/** Cast, director/creator and keywords for a title — the affinity fingerprint. */
export async function titleDetails(
  mediaType: MediaType,
  id: number,
): Promise<TitleDetails> {
  const url = withKey(`/${mediaType}/${id}`, {
    append_to_response: "credits,keywords",
    language: "en-US",
  });
  try {
    const data = await getJSON<DetailsResponse>(url, DAY);
    const genreIds = (data.genres ?? []).map((g) => g.id);
    const kwArr =
      mediaType === "movie" ? data.keywords?.keywords : data.keywords?.results;
    const keywords = (kwArr ?? [])
      .slice(0, 10)
      .map((k) => ({ id: k.id, name: k.name }));

    const people: Person[] = [];
    for (const c of (data.credits?.cast ?? []).slice(0, 4)) {
      people.push({ id: c.id, name: c.name, role: "Cast" });
    }
    if (mediaType === "movie") {
      for (const c of (data.credits?.crew ?? []).filter(
        (m) => m.job === "Director",
      )) {
        people.push({ id: c.id, name: c.name, role: "Director" });
      }
    } else {
      for (const c of (data.created_by ?? []).slice(0, 2)) {
        people.push({ id: c.id, name: c.name, role: "Creator" });
      }
    }
    return { genreIds, keywords, people };
  } catch {
    return { genreIds: [], keywords: [], people: [] };
  }
}

/** Best YouTube trailer key for a title, or null if none. */
export async function trailerKey(
  mediaType: MediaType,
  id: number,
): Promise<string | null> {
  const url = withKey(`/${mediaType}/${id}/videos`, { language: "en-US" });
  try {
    const data = await getJSON<{
      results: Array<{
        key: string;
        site: string;
        type: string;
        official?: boolean;
      }>;
    }>(url, DAY);
    const yt = data.results.filter((v) => v.site === "YouTube");
    const pick =
      yt.find((v) => v.type === "Trailer" && v.official) ??
      yt.find((v) => v.type === "Trailer") ??
      yt.find((v) => v.type === "Teaser") ??
      yt[0];
    return pick?.key ?? null;
  } catch {
    return null;
  }
}

/**
 * Discover titles filtered to a specific affinity signal (a person or a keyword)
 * AND to titles streaming on the given providers in the region. Because the
 * provider filter is applied server-side by TMDb, everything returned is already
 * available on the user's services.
 */
export async function discover(opts: {
  mediaType: MediaType;
  region: string;
  providers: number[];
  withPerson?: number;
  withKeyword?: number;
}): Promise<NormalizedTitle[]> {
  const params: Record<string, string> = {
    language: "en-US",
    page: "1",
    sort_by: "popularity.desc",
    watch_region: opts.region,
    with_watch_providers: opts.providers.join("|"),
    with_watch_monetization_types: "flatrate",
    "vote_count.gte": "20",
  };
  if (opts.withPerson) params.with_people = String(opts.withPerson);
  if (opts.withKeyword) params.with_keywords = String(opts.withKeyword);
  const url = withKey(`/discover/${opts.mediaType}`, params);
  try {
    const data = await getJSON<{ results: TmdbTitle[] }>(url, DAY);
    return data.results.map((r) => normalize(r, opts.mediaType));
  } catch {
    return [];
  }
}

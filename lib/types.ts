export type MediaType = "movie" | "tv";

/** An entry in the user's personal taste list. Persisted in the browser. */
export interface Favorite {
  id: number; // TMDb id
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  /** true = "I really, REALLY loved this" — weighted much higher. */
  superLike: boolean;
  addedAt: number;
}

/** A title saved to the watchlist via a right-swipe. Lighter than a Favorite:
 *  it's a "want to watch" marker, not a taste seed that drives recommendations. */
export interface SavedItem {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  addedAt: number;
}

/** A streaming provider the user can toggle on/off. */
export interface Platform {
  /** TMDb/JustWatch provider id. */
  id: number;
  name: string;
  /** Short key used in the UI. */
  key: string;
}

/** A title returned by search (for adding to the taste list). */
export interface SearchResult {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
}

/** A single recommendation, already filtered to the user's platforms. */
export interface Recommendation {
  id: number;
  mediaType: MediaType;
  title: string;
  year: string | null;
  posterPath: string | null;
  overview: string;
  voteAverage: number;
  /** Internal ranking score. */
  score: number;
  /** Names of the user's favorites that led here, e.g. ["Arrival", "Dune"]. */
  becauseOf: string[];
  /** Provider ids (from the user's enabled set) that stream this title. */
  availableOn: number[];
}

export interface RecommendRequest {
  favorites: Array<Pick<Favorite, "id" | "mediaType" | "title" | "superLike">>;
  /** Provider ids the user has toggled on. */
  platforms: number[];
  /** (mediaType:id) keys the user marked "not interested". */
  hidden: string[];
  /** ISO 3166-1 region for availability lookups, e.g. "US". */
  region?: string;
}

export interface RecommendResponse {
  recommendations: Recommendation[];
  /** Non-fatal notes to surface in the UI (e.g. "no favorites yet"). */
  note?: string;
}

export function favKey(mediaType: MediaType, id: number): string {
  return `${mediaType}:${id}`;
}

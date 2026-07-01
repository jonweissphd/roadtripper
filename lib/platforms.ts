import type { Platform } from "./types";

// The streaming services users can toggle. `id` is the TMDb/JustWatch provider
// id used by the /watch/providers endpoint (US). These ids are stable; if a
// provider ever stops matching, verify against
// https://api.themoviedb.org/3/watch/providers/movie?watch_region=US
export const PLATFORMS: Platform[] = [
  { id: 8, key: "netflix", name: "Netflix" },
  { id: 15, key: "hulu", name: "Hulu" },
  { id: 337, key: "disney", name: "Disney+" },
  { id: 1899, key: "max", name: "Max" },
  { id: 9, key: "prime", name: "Prime Video" },
  { id: 350, key: "appletv", name: "Apple TV+" },
  { id: 386, key: "peacock", name: "Peacock" },
  { id: 531, key: "paramount", name: "Paramount+" },
  { id: 526, key: "amc", name: "AMC+" },
  { id: 257, key: "fubo", name: "fuboTV" },
  { id: 387, key: "peacock_premium", name: "Peacock Premium" },
  { id: 34, key: "mgm", name: "MGM+" },
];

const BY_ID = new Map(PLATFORMS.map((p) => [p.id, p]));

export function platformName(id: number): string {
  return BY_ID.get(id)?.name ?? `Provider ${id}`;
}

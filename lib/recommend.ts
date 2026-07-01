import "server-only";
import {
  flatrateProviders,
  NormalizedTitle,
  recommendationsFor,
  similarTo,
} from "./tmdb";
import {
  favKey,
  MediaType,
  Recommendation,
  RecommendRequest,
  RecommendResponse,
} from "./types";

// Scoring weights.
const SUPER_LIKE_WEIGHT = 3;
const LIKE_WEIGHT = 1;
// TMDb "recommendations" are a stronger signal than "similar"; blend both.
const REC_SOURCE_WEIGHT = 1;
const SIMILAR_SOURCE_WEIGHT = 0.6;
// How many top-scoring candidates to check availability for. Availability is one
// network call each, so we cap it — anything past this rarely survives filtering.
const AVAILABILITY_CHECK_LIMIT = 80;
const MAX_RESULTS = 40;

interface Candidate {
  title: NormalizedTitle;
  score: number;
  becauseOf: Set<string>;
}

/** Run tasks with limited concurrency to stay polite with TMDb. */
async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker),
  );
  return results;
}

export async function recommend(
  req: RecommendRequest,
): Promise<RecommendResponse> {
  const { favorites, platforms, hidden } = req;

  if (favorites.length === 0) {
    return {
      recommendations: [],
      note: "Add a few favorites to get recommendations.",
    };
  }
  if (platforms.length === 0) {
    return {
      recommendations: [],
      note: "Turn on at least one streaming service to see what you can watch.",
    };
  }

  const enabled = new Set(platforms);
  const hiddenSet = new Set(hidden);
  // Never recommend something already in the taste list.
  const ownedSet = new Set(favorites.map((f) => favKey(f.mediaType, f.id)));

  // 1) Gather candidates from every favorite, weighted by super-like.
  const candidates = new Map<string, Candidate>();

  const gathered = await mapLimit(favorites, 4, async (fav) => {
    const weight = fav.superLike ? SUPER_LIKE_WEIGHT : LIKE_WEIGHT;
    const [recs, sims] = await Promise.all([
      recommendationsFor(fav.mediaType, fav.id),
      similarTo(fav.mediaType, fav.id),
    ]);
    return { fav, weight, recs, sims };
  });

  for (const { fav, weight, recs, sims } of gathered) {
    const add = (
      title: NormalizedTitle,
      sourceWeight: number,
    ) => {
      const key = favKey(title.mediaType, title.id);
      if (ownedSet.has(key) || hiddenSet.has(key)) return;
      const existing = candidates.get(key);
      const contribution = weight * sourceWeight;
      if (existing) {
        existing.score += contribution;
        existing.becauseOf.add(fav.title);
      } else {
        candidates.set(key, {
          title,
          score: contribution,
          becauseOf: new Set([fav.title]),
        });
      }
    };
    recs.forEach((t) => add(t, REC_SOURCE_WEIGHT));
    sims.forEach((t) => add(t, SIMILAR_SOURCE_WEIGHT));
  }

  if (candidates.size === 0) {
    return {
      recommendations: [],
      note: "Couldn't find related titles yet — try adding more favorites.",
    };
  }

  // 2) Blend in a mild quality signal so ties break toward well-liked titles,
  //    without letting popularity dominate personal taste.
  for (const c of candidates.values()) {
    const quality = c.title.voteCount > 50 ? c.title.voteAverage / 10 : 0;
    c.score = c.score * (1 + 0.25 * quality);
  }

  // 3) Take the strongest candidates and check what streams on the user's
  //    services, keeping only those available on an enabled platform.
  const ranked = Array.from(candidates.values()).sort(
    (a, b) => b.score - a.score,
  );
  const toCheck = ranked.slice(0, AVAILABILITY_CHECK_LIMIT);

  const withAvailability = await mapLimit(toCheck, 6, async (c) => {
    const providers = await flatrateProviders(c.title.mediaType, c.title.id);
    const availableOn = providers.filter((p) => enabled.has(p));
    return { c, availableOn };
  });

  const recommendations: Recommendation[] = withAvailability
    .filter((x) => x.availableOn.length > 0)
    .map(({ c, availableOn }) => ({
      id: c.title.id,
      mediaType: c.title.mediaType,
      title: c.title.title,
      year: c.title.year,
      posterPath: c.title.posterPath,
      overview: c.title.overview,
      voteAverage: c.title.voteAverage,
      score: Math.round(c.score * 100) / 100,
      becauseOf: Array.from(c.becauseOf).slice(0, 3),
      availableOn,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RESULTS);

  const note =
    recommendations.length === 0
      ? "Related titles were found, but none are currently on your selected services. Try enabling more platforms."
      : undefined;

  return { recommendations, note };
}

export type { MediaType };

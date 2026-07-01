import "server-only";
import {
  discover,
  flatrateProviders,
  NormalizedTitle,
  recommendationsFor,
  similarTo,
  titleDetails,
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
// Title-to-title signals ("people who liked X also liked...").
const REC_SOURCE_WEIGHT = 1;
const SIMILAR_SOURCE_WEIGHT = 0.6;
// Affinity signals (shared cast/director/creator and keywords across favorites).
const DISCOVER_PERSON_WEIGHT = 0.9;
const DISCOVER_KEYWORD_WEIGHT = 0.5;
// How many of the strongest affinity signals to actually query for.
const TOP_PEOPLE = 4;
const TOP_KEYWORDS = 5;
// How many top-scoring candidates to check availability for. Availability is one
// network call each, so we cap it.
const AVAILABILITY_CHECK_LIMIT = 90;
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

/** A weighted tally of affinity signal ids that also remembers a display name. */
class WeightedSignals {
  private map = new Map<number, { weight: number; name: string }>();
  add(id: number, name: string, weight: number) {
    const cur = this.map.get(id);
    if (cur) cur.weight += weight;
    else this.map.set(id, { weight, name });
  }
  top(n: number): Array<{ id: number; name: string; weight: number }> {
    return Array.from(this.map.entries())
      .map(([id, v]) => ({ id, name: v.name, weight: v.weight }))
      .sort((a, b) => b.weight - a.weight)
      .slice(0, n);
  }
}

export async function recommend(
  req: RecommendRequest,
): Promise<RecommendResponse> {
  const { favorites, platforms, hidden } = req;
  const region = req.region || "US";

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
  const ownedSet = new Set(favorites.map((f) => favKey(f.mediaType, f.id)));

  const candidates = new Map<string, Candidate>();
  const addCandidate = (
    title: NormalizedTitle,
    contribution: number,
    reason: string,
  ) => {
    const key = favKey(title.mediaType, title.id);
    if (ownedSet.has(key) || hiddenSet.has(key)) return;
    const existing = candidates.get(key);
    if (existing) {
      existing.score += contribution;
      existing.becauseOf.add(reason);
    } else {
      candidates.set(key, {
        title,
        score: contribution,
        becauseOf: new Set([reason]),
      });
    }
  };

  // 1) For every favorite, pull title-to-title picks AND its affinity fingerprint.
  const people = new WeightedSignals();
  const keywords = new WeightedSignals();

  const gathered = await mapLimit(favorites, 4, async (fav) => {
    const weight = fav.superLike ? SUPER_LIKE_WEIGHT : LIKE_WEIGHT;
    const [recs, sims, details] = await Promise.all([
      recommendationsFor(fav.mediaType, fav.id),
      similarTo(fav.mediaType, fav.id),
      titleDetails(fav.mediaType, fav.id),
    ]);
    return { fav, weight, recs, sims, details };
  });

  for (const { fav, weight, recs, sims, details } of gathered) {
    recs.forEach((t) => addCandidate(t, weight * REC_SOURCE_WEIGHT, fav.title));
    sims.forEach((t) =>
      addCandidate(t, weight * SIMILAR_SOURCE_WEIGHT, fav.title),
    );
    // Cast/director/creator drive people affinity; keywords drive theme affinity.
    for (const p of details.people) people.add(p.id, p.name, weight);
    for (const k of details.keywords) keywords.add(k.id, k.name, weight);
  }

  // 2) Turn the strongest affinity signals into more candidates — and because
  //    `discover` filters by provider, these are already available to the user.
  const topPeople = people.top(TOP_PEOPLE);
  const topKeywords = keywords.top(TOP_KEYWORDS);

  const affinityQueries: Array<Promise<void>> = [];

  for (const person of topPeople) {
    // with_people is reliable on /discover/movie only.
    affinityQueries.push(
      discover({
        mediaType: "movie",
        region,
        providers: platforms,
        withPerson: person.id,
      }).then((titles) => {
        for (const t of titles) {
          addCandidate(t, person.weight * DISCOVER_PERSON_WEIGHT, person.name);
        }
      }),
    );
  }

  for (const kw of topKeywords) {
    for (const mediaType of ["movie", "tv"] as MediaType[]) {
      affinityQueries.push(
        discover({
          mediaType,
          region,
          providers: platforms,
          withKeyword: kw.id,
        }).then((titles) => {
          for (const t of titles) {
            addCandidate(t, kw.weight * DISCOVER_KEYWORD_WEIGHT, kw.name);
          }
        }),
      );
    }
  }

  await Promise.all(affinityQueries);

  if (candidates.size === 0) {
    return {
      recommendations: [],
      note: "Couldn't find related titles yet — try adding more favorites.",
    };
  }

  // 3) Mild quality tie-breaker so ties lean toward well-liked titles.
  for (const c of candidates.values()) {
    const quality = c.title.voteCount > 50 ? c.title.voteAverage / 10 : 0;
    c.score = c.score * (1 + 0.25 * quality);
  }

  // 4) Confirm exactly which of the user's services carry each top candidate.
  const ranked = Array.from(candidates.values()).sort(
    (a, b) => b.score - a.score,
  );
  const toCheck = ranked.slice(0, AVAILABILITY_CHECK_LIMIT);

  const withAvailability = await mapLimit(toCheck, 6, async (c) => {
    const providers = await flatrateProviders(
      c.title.mediaType,
      c.title.id,
      region,
    );
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
      ? "Related titles were found, but none are currently on your selected services. Try enabling more platforms or a different region."
      : undefined;

  return { recommendations, note };
}

export type { MediaType };

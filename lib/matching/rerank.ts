import "server-only";

const GEMINI_KEY = process.env.GOOGLE_GEMINI_API_KEY;
const MODEL = "gemini-2.5-flash";

export type RerankInput = {
  id: string;
  name: string;
  formatted_address?: string;
  rating?: number;
  review_count?: number;
  matched_interests: string[];
  review_excerpts: string[];
  types: string[];
};

export type RerankOutput = {
  id: string;
  score: number;
  reasoning: string;
};

const FOOD_TYPES = new Set([
  "restaurant", "food", "bakery", "cafe", "bar", "meal_delivery",
  "meal_takeaway", "ice_cream_shop", "coffee_shop", "fast_food_restaurant",
]);

function fallbackScore(c: RerankInput, localsOnly = false): RerankOutput {
  const rating = c.rating ?? 0;
  const reviews = c.review_count ?? 0;
  let score = rating * 1.2;
  if (reviews >= 50 && reviews <= 2000) score += 1.5;
  if (rating >= 4.3 && rating <= 4.8) score += 1;
  const isFood = c.types.some((t) => FOOD_TYPES.has(t));
  if (!isFood) score += 3;
  // Penalize likely chains when locals-only is on.
  if (localsOnly && reviews > 3000) score -= 5;
  return {
    id: c.id,
    score: Math.max(0, Math.min(10, score)),
    reasoning: localsOnly && reviews > 3000
      ? "Likely chain (high review count)"
      : "Heuristic fallback (Gemini unavailable)",
  };
}

export async function rerankPlaces(
  candidates: RerankInput[],
  localsOnly = false,
  context?: { regionHint?: string; userInterests?: string[] },
): Promise<RerankOutput[]> {
  if (candidates.length === 0) return [];
  if (!GEMINI_KEY) return candidates.map((c) => fallbackScore(c, localsOnly));

  const localsOnlyBlock = localsOnly
    ? `
CRITICAL — LOCALS ONLY MODE IS ON:
The user ONLY wants independent, locally-owned, mom & pop businesses. Score ANY chain or franchise a 0. This includes national and regional chains of any kind — fast food, coffee, retail, hotels, gas stations, etc. If a place has locations in multiple cities, it's a chain. Be aggressive about filtering these out. Only true one-of-a-kind local spots should score above 3.
`
    : "";

  const contextBlock = [
    context?.regionHint ? `Region: ${context.regionHint}` : "",
    context?.userInterests?.length
      ? `The travelers are specifically interested in: ${context.userInterests.join(", ")}. Strongly reward places that align with these interests.`
      : "",
  ].filter(Boolean).join("\n");

  const prompt = `You are an opinionated travel editor ranking stops for the Detour road trip app. Surface hidden gems and local favorites — not the first Google result.
${localsOnlyBlock}
${contextBlock ? `\n${contextBlock}\n` : ""}
For each place, return a score 0-10 and a VERY SHORT reason (8-14 words max, NO complete sentence needed). Write like a punchy travel guide tagline — specific, opinionated, no fluff.

Good reasons (short, vivid, specific):
- "Cult-following brisket; locals drive 2 hours for it."
- "Quirky 1950s diner; pie wins awards every year."
- "Riverside trail with the region's best fall colors."
- "Tiny vinyl shop packed with rare jazz pressings."

Bad reasons (too long, generic, hedging):
- "This is a popular local restaurant that serves great food and has been around for many years."
- "A nice place to visit if you have time."

Scoring rubric:
- 8-10: One-of-a-kind, legendary, cult following, defines the town
- 5-7: Strong independent with loyal locals, clear character
- 2-4: Fine but interchangeable with any town
- 0-1: Chains, franchises, tourist traps, generic with no character

Candidates:
${JSON.stringify(candidates, null, 2)}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                results: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      id: { type: "STRING" },
                      score: { type: "NUMBER" },
                      reasoning: { type: "STRING" },
                    },
                    required: ["id", "score", "reasoning"],
                  },
                },
              },
              required: ["results"],
            },
          },
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Gemini rerank error", response.status, text);
      return candidates.map((c) => fallbackScore(c, localsOnly));
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return candidates.map((c) => fallbackScore(c, localsOnly));

    const parsed = JSON.parse(text) as { results?: RerankOutput[] };
    const results = parsed.results ?? [];

    // Make sure every candidate has an entry — fall back per-id if missing.
    const byId = new Map(results.map((r) => [r.id, r]));
    return candidates.map(
      (c) => byId.get(c.id) ?? fallbackScore(c, localsOnly),
    );
  } catch (err) {
    console.error("Gemini rerank threw", err);
    return candidates.map((c) => fallbackScore(c, localsOnly));
  }
}

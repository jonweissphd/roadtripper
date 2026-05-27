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

  const prompt = `You are an opinionated travel editor ranking stops for a road trip app called Detour. Your job is to surface the places a well-traveled local would insist on — hidden gems, beloved neighborhood spots, one-of-a-kind experiences. NOT the first Google result.
${localsOnlyBlock}
${contextBlock ? `\n${contextBlock}\n` : ""}
For each place, return a score 0-10 and a SHORT punchy one-sentence reason that would make someone want to visit. Write the reason as if recommending to a friend — conversational, specific, opinionated. Bad: "Popular local restaurant." Good: "The smoked brisket here has a cult following — people drive 2 hours for it."

Score 8-10 (Must visit):
- Truly one-of-a-kind: the only one in the region, legendary status, cult following
- Reviews gush with specifics ("best X I've ever had", "hidden gem", "worth the drive")
- The kind of place that defines a town or neighborhood
- Unique experiences you literally cannot get anywhere else

Score 5-7 (Worth a stop):
- Strong independent spots with loyal locals and clear character
- Well-regarded parks, trails, cultural sites with real draw
- Interesting specialty shops or experiences that match the travelers' interests

Score 2-4 (Fine but not special):
- Decent places that are interchangeable with others in any town
- Generic restaurants without a standout dish or story
- Mildly interesting but nothing you'd remember

Score 0-1 (Skip):
- Chains, franchises, or multi-location businesses of any kind
- Tourist traps, gift shops attached to gas stations
- Suspiciously perfect 5.0 ratings with <10 reviews
- Places with generic names and no distinguishing character

Here are the candidates:
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

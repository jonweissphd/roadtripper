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

function fallbackScore(c: RerankInput): RerankOutput {
  const rating = c.rating ?? 0;
  const reviews = c.review_count ?? 0;
  let score = rating * 1.2;
  if (reviews >= 50 && reviews <= 2000) score += 1.5;
  if (rating >= 4.3 && rating <= 4.8) score += 1;
  const isFood = c.types.some((t) => FOOD_TYPES.has(t));
  if (!isFood) score += 3;
  return {
    id: c.id,
    score: Math.max(0, Math.min(10, score)),
    reasoning: "Heuristic fallback (Gemini unavailable)",
  };
}

export async function rerankPlaces(
  candidates: RerankInput[],
): Promise<RerankOutput[]> {
  if (candidates.length === 0) return [];
  if (!GEMINI_KEY) return candidates.map(fallbackScore);

  const prompt = `You are ranking road-trip stops by how "worth the detour" they are — the kind of places a local would insist you visit, not what shows up first on Google.

For each place, return a score 0-10 and a one-sentence reason.

Strong reward signals (score 7-10):
- Hidden gems, local legends, one-of-a-kind spots
- Unique outdoor/activity/cultural experiences you can't get elsewhere
- Independent operators with a loyal following
- "Only in this town" character — quirky museums, roadside oddities, legendary local spots
- Reviews mentioning "hidden gem", "local favorite", "don't miss", "worth the drive"
- Sweet-spot ratings 4.3-4.8 with real reviews (not inflated)

Moderate reward (4-6):
- Solid independent restaurants or cafés with strong local reputation
- Well-known parks, trails, or scenic spots

Penalize (0-3):
- Generic chains of any kind (fast food, coffee, retail)
- Tourist traps with shallow praise
- Any restaurant that isn't locally iconic or notable — a random pizza place is a 1, a legendary regional BBQ joint is a 7
- Suspiciously perfect 5.0 with very few reviewers

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
      return candidates.map(fallbackScore);
    }

    const data = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return candidates.map(fallbackScore);

    const parsed = JSON.parse(text) as { results?: RerankOutput[] };
    const results = parsed.results ?? [];

    // Make sure every candidate has an entry — fall back per-id if missing.
    const byId = new Map(results.map((r) => [r.id, r]));
    return candidates.map(
      (c) => byId.get(c.id) ?? fallbackScore(c),
    );
  } catch (err) {
    console.error("Gemini rerank threw", err);
    return candidates.map(fallbackScore);
  }
}

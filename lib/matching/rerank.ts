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

function fallbackScore(c: RerankInput): RerankOutput {
  // No LLM available → use a sweet-spot heuristic so ranking degrades gracefully.
  const rating = c.rating ?? 0;
  const reviews = c.review_count ?? 0;
  let score = rating * 1.5; // 0..7.5 for 0..5 star rating
  if (reviews >= 50 && reviews <= 2000) score += 1.5;
  if (rating >= 4.3 && rating <= 4.8) score += 1;
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

  const prompt = `You are ranking road-trip candidate places by editorial cred — likelihood of appearing on local food blogs, "best of" lists, or in-the-know recommendations.

For each place, return a score 0-10 and a one-sentence reason.

Reward signals:
- Independent operators (not chains)
- "Hidden gem", "local favorite", "best in town" mentions in reviews
- Sweet-spot ratings 4.3-4.8 with hundreds of real reviews

Penalize:
- Generic chains (Panda Express, McDonald's, Olive Garden, etc.)
- Tourist traps with shallow praise
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

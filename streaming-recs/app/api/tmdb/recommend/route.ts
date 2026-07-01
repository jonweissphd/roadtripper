import { NextRequest, NextResponse } from "next/server";
import { assertConfigured } from "@/lib/tmdb";
import { recommend } from "@/lib/recommend";
import type { RecommendRequest } from "@/lib/types";

export const runtime = "nodejs";
// Fanning out to TMDb for many favorites can take a few seconds.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  let body: RecommendRequest;
  try {
    body = (await req.json()) as RecommendRequest;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const favorites = Array.isArray(body.favorites) ? body.favorites : [];
  const platforms = Array.isArray(body.platforms) ? body.platforms : [];
  const hidden = Array.isArray(body.hidden) ? body.hidden : [];

  try {
    assertConfigured();
    const result = await recommend({ favorites, platforms, hidden });
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Recommendation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

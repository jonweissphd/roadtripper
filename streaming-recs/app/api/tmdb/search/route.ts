import { NextRequest, NextResponse } from "next/server";
import { assertConfigured, searchTitles } from "@/lib/tmdb";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ results: [] });
  try {
    assertConfigured();
    const results = await searchTitles(query);
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

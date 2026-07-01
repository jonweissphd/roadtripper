import { NextRequest, NextResponse } from "next/server";
import { assertConfigured, trailerKey } from "@/lib/tmdb";
import type { MediaType } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type");
  const id = Number(req.nextUrl.searchParams.get("id"));
  if ((type !== "movie" && type !== "tv") || !Number.isFinite(id)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  try {
    assertConfigured();
    const key = await trailerKey(type as MediaType, id);
    return NextResponse.json({ key });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

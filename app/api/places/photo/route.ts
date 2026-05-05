import { type NextRequest, NextResponse } from "next/server";
import { fetchPlacePhotoUrl } from "@/lib/google/places";
import { createClient } from "@/lib/supabase/server";

// Resolves a Place photo's short-lived media URL and redirects the browser to it.
// Keeps GOOGLE_MAPS_SERVER_KEY off the wire and lets browsers cache the redirect briefly.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const name = request.nextUrl.searchParams.get("name");
  if (!name || !name.startsWith("places/")) {
    return new NextResponse("invalid photo name", { status: 400 });
  }

  const maxParam = request.nextUrl.searchParams.get("max");
  const maxWidth = Math.max(
    100,
    Math.min(1600, parseInt(maxParam ?? "800", 10) || 800),
  );

  const url = await fetchPlacePhotoUrl(name, maxWidth);
  if (!url) {
    return new NextResponse("photo not found", { status: 404 });
  }

  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "private, max-age=300" },
  });
}

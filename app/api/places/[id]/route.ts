import { NextResponse } from "next/server";
import { fetchPlaceDetails } from "@/lib/google/places";
import { createClient } from "@/lib/supabase/server";

// Optional pass-through for client-side detail fetches.
// Auth-gated to logged-in users so a leaked URL can't be abused as a free Places lookup.
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const details = await fetchPlaceDetails(id);
  if (!details) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(details, {
    headers: { "Cache-Control": "private, max-age=300" },
  });
}

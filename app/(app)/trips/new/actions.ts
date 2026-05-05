"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MIN_INTERESTS = 5;

export async function createTrip(formData: FormData) {
  // parseFloat returns NaN for empty strings (Number("") is 0, which would
  // silently create a trip at lat=0,lng=0 in the Atlantic).
  const origin_address = String(formData.get("origin_address") ?? "").trim();
  const origin_lat = parseFloat(String(formData.get("origin_lat") ?? ""));
  const origin_lng = parseFloat(String(formData.get("origin_lng") ?? ""));
  const origin_place_id = String(formData.get("origin_place_id") ?? "");
  const dest_address = String(formData.get("dest_address") ?? "").trim();
  const dest_lat = parseFloat(String(formData.get("dest_lat") ?? ""));
  const dest_lng = parseFloat(String(formData.get("dest_lng") ?? ""));
  const dest_place_id = String(formData.get("dest_place_id") ?? "");

  if (
    !origin_address ||
    !dest_address ||
    !Number.isFinite(origin_lat) ||
    !Number.isFinite(origin_lng) ||
    !Number.isFinite(dest_lat) ||
    !Number.isFinite(dest_lng)
  ) {
    redirect(
      `/trips/new?error=${encodeURIComponent(
        "Pick a start and end address from the dropdown",
      )}`,
    );
  }

  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("profile_interests")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id);

  if ((count ?? 0) < MIN_INTERESTS) {
    redirect(
      `/profile?error=${encodeURIComponent(
        `Pick at least ${MIN_INTERESTS} interests before creating a trip.`,
      )}`,
    );
  }

  const invite_token = randomBytes(24).toString("base64url");

  const { data: trip, error } = await supabase
    .from("trips")
    .insert({
      creator_id: user.id,
      origin_address,
      origin_lat,
      origin_lng,
      origin_place_id: origin_place_id || null,
      dest_address,
      dest_lat,
      dest_lng,
      dest_place_id: dest_place_id || null,
      invite_token,
    })
    .select("id")
    .single();

  if (error || !trip) {
    redirect(
      `/trips/new?error=${encodeURIComponent(
        error?.message ?? "Failed to create trip",
      )}`,
    );
  }

  redirect(`/trips/${trip.id}`);
}

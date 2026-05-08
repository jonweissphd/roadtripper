"use server";

import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const MIN_INTERESTS = 5;

export async function createExplore(formData: FormData) {
  const location_address = String(
    formData.get("location_address") ?? "",
  ).trim();
  const location_lat = parseFloat(
    String(formData.get("location_lat") ?? ""),
  );
  const location_lng = parseFloat(
    String(formData.get("location_lng") ?? ""),
  );
  const location_place_id = String(
    formData.get("location_place_id") ?? "",
  );

  if (
    !location_address ||
    !Number.isFinite(location_lat) ||
    !Number.isFinite(location_lng)
  ) {
    redirect(
      `/explore/new?error=${encodeURIComponent(
        "Pick a city or area from the dropdown",
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
        `Pick at least ${MIN_INTERESTS} interests before exploring.`,
      )}`,
    );
  }

  const invite_token = randomBytes(24).toString("base64url");

  // For explore trips, dest mirrors origin. trip_type distinguishes the two.
  const { data: trip, error } = await supabase
    .from("trips")
    .insert({
      creator_id: user.id,
      origin_address: location_address,
      origin_lat: location_lat,
      origin_lng: location_lng,
      origin_place_id: location_place_id || null,
      dest_address: location_address,
      dest_lat: location_lat,
      dest_lng: location_lng,
      dest_place_id: location_place_id || null,
      invite_token,
      trip_type: "explore",
    })
    .select("id")
    .single();

  if (error || !trip) {
    redirect(
      `/explore/new?error=${encodeURIComponent(
        error?.message ?? "Failed to create explore",
      )}`,
    );
  }

  redirect(`/trips/${trip.id}`);
}

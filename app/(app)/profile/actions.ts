"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const display_name = String(formData.get("display_name") ?? "").trim();
  const locals_only = formData.get("locals_only") === "1";
  const interest_ids = formData
    .getAll("interest_id")
    .map((v) => String(v))
    .filter(Boolean);

  if (!display_name) {
    redirect(`/profile?error=${encodeURIComponent("Display name is required")}`);
  }

  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name, locals_only }, { onConflict: "id" });

  if (profileError) {
    redirect(`/profile?error=${encodeURIComponent(profileError.message)}`);
  }

  // Replace interests: delete then insert. Not atomic, fine at v1 scale.
  await supabase.from("profile_interests").delete().eq("profile_id", user.id);

  if (interest_ids.length > 0) {
    const rows = interest_ids.map((interest_id) => ({
      profile_id: user.id,
      interest_id,
    }));
    const { error: interestsError } = await supabase
      .from("profile_interests")
      .insert(rows);
    if (interestsError) {
      redirect(`/profile?error=${encodeURIComponent(interestsError.message)}`);
    }
  }

  revalidatePath("/profile");
  redirect("/profile?saved=1");
}

/** Save profile and redirect straight to trip creation. */
export async function saveProfileAndGo(formData: FormData) {
  const display_name = String(formData.get("display_name") ?? "").trim();
  const locals_only = formData.get("locals_only") === "1";
  const interest_ids = formData
    .getAll("interest_id")
    .map((v) => String(v))
    .filter(Boolean);

  if (!display_name) {
    redirect(`/profile?error=${encodeURIComponent("Display name is required")}`);
  }

  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name, locals_only }, { onConflict: "id" });

  if (profileError) {
    redirect(`/profile?error=${encodeURIComponent(profileError.message)}`);
  }

  await supabase.from("profile_interests").delete().eq("profile_id", user.id);

  if (interest_ids.length > 0) {
    const rows = interest_ids.map((interest_id) => ({
      profile_id: user.id,
      interest_id,
    }));
    await supabase.from("profile_interests").insert(rows);
  }

  redirect("/trips/new");
}

/** Save profile and redirect to an existing trip (used after accepting an invite). */
export async function saveProfileAndGoToTrip(formData: FormData) {
  const display_name = String(formData.get("display_name") ?? "").trim();
  const locals_only = formData.get("locals_only") === "1";
  const interest_ids = formData
    .getAll("interest_id")
    .map((v) => String(v))
    .filter(Boolean);
  const tripId = String(formData.get("joined_trip_id") ?? "").trim();

  if (!display_name) {
    redirect(`/profile?error=${encodeURIComponent("Display name is required")}`);
  }

  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name, locals_only }, { onConflict: "id" });

  if (profileError) {
    redirect(`/profile?error=${encodeURIComponent(profileError.message)}`);
  }

  await supabase.from("profile_interests").delete().eq("profile_id", user.id);

  if (interest_ids.length > 0) {
    const rows = interest_ids.map((interest_id) => ({
      profile_id: user.id,
      interest_id,
    }));
    await supabase.from("profile_interests").insert(rows);
  }

  redirect(tripId ? `/trips/${tripId}` : "/trips/new");
}

/**
 * Save profile + create a trip in one go, then redirect to the trip page
 * with auto-search enabled. This is the "Let's Detour →" path: one click
 * from interests/addresses to seeing results loading.
 */
export async function saveProfileAndCreateTrip(formData: FormData) {
  const display_name = String(formData.get("display_name") ?? "").trim();
  const locals_only = formData.get("locals_only") === "1";
  const interest_ids = formData
    .getAll("interest_id")
    .map((v) => String(v))
    .filter(Boolean);
  const mode = String(formData.get("trip_mode") ?? "roadtrip");

  const origin_address = String(formData.get("origin_address") ?? "").trim();
  const origin_lat = parseFloat(String(formData.get("origin_lat") ?? ""));
  const origin_lng = parseFloat(String(formData.get("origin_lng") ?? ""));
  const origin_place_id = String(formData.get("origin_place_id") ?? "");

  if (!display_name) {
    redirect(`/profile?error=${encodeURIComponent("Display name is required")}`);
  }
  if (interest_ids.length < 5) {
    redirect(`/profile?error=${encodeURIComponent("Pick at least 5 interests")}`);
  }
  if (
    !origin_address ||
    !Number.isFinite(origin_lat) ||
    !Number.isFinite(origin_lng)
  ) {
    redirect(
      `/profile?error=${encodeURIComponent(
        mode === "explore"
          ? "Pick a city or area from the dropdown"
          : "Pick a starting address from the dropdown",
      )}`,
    );
  }

  let dest_address = origin_address;
  let dest_lat = origin_lat;
  let dest_lng = origin_lng;
  let dest_place_id = origin_place_id;

  if (mode === "roadtrip") {
    dest_address = String(formData.get("dest_address") ?? "").trim();
    dest_lat = parseFloat(String(formData.get("dest_lat") ?? ""));
    dest_lng = parseFloat(String(formData.get("dest_lng") ?? ""));
    dest_place_id = String(formData.get("dest_place_id") ?? "");
    if (
      !dest_address ||
      !Number.isFinite(dest_lat) ||
      !Number.isFinite(dest_lng)
    ) {
      redirect(
        `/profile?error=${encodeURIComponent(
          "Pick a destination address from the dropdown",
        )}`,
      );
    }
  }

  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  // 1. Save profile fields.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name, locals_only }, { onConflict: "id" });
  if (profileError) {
    redirect(`/profile?error=${encodeURIComponent(profileError.message)}`);
  }

  // 2. Replace interests.
  await supabase.from("profile_interests").delete().eq("profile_id", user.id);
  if (interest_ids.length > 0) {
    const rows = interest_ids.map((interest_id) => ({
      profile_id: user.id,
      interest_id,
    }));
    await supabase.from("profile_interests").insert(rows);
  }

  // 3. Create the trip.
  const invite_token = randomBytes(24).toString("base64url");
  const { data: trip, error: tripError } = await supabase
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
      trip_type: mode === "explore" ? "explore" : "roadtrip",
    })
    .select("id")
    .single();

  if (tripError || !trip) {
    redirect(
      `/profile?error=${encodeURIComponent(
        tripError?.message ?? "Failed to create trip",
      )}`,
    );
  }

  // 4. Land on the trip page with auto-search enabled.
  redirect(`/trips/${trip.id}?autoSearch=1`);
}

/** Auto-save just the interest selections (called on each toggle). */
export async function autoSaveInterests(interestIds: string[]) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) return;

  await supabase.from("profile_interests").delete().eq("profile_id", user.id);

  if (interestIds.length > 0) {
    const rows = interestIds.map((interest_id) => ({
      profile_id: user.id,
      interest_id,
    }));
    await supabase.from("profile_interests").insert(rows);
  }
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function saveProfile(formData: FormData) {
  const display_name = String(formData.get("display_name") ?? "").trim();
  const interest_ids = formData
    .getAll("interest_id")
    .map((v) => String(v))
    .filter(Boolean);

  if (!display_name) {
    redirect(`/profile?error=${encodeURIComponent("Display name is required")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id, display_name }, { onConflict: "id" });

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

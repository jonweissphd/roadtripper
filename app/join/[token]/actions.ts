"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function acceptInvite(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/profile");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
  }

  const admin = createAdminClient();

  // Atomic accept: only fills the slot if it's empty AND the user isn't the creator.
  const { data: updated, error } = await admin
    .from("trips")
    .update({ guest_id: user.id, status: "active" })
    .eq("invite_token", token)
    .is("guest_id", null)
    .neq("creator_id", user.id)
    .select("id")
    .maybeSingle();

  if (error) {
    redirect(
      `/join/${token}?error=${encodeURIComponent(error.message)}`,
    );
  }
  if (!updated) {
    // Slot taken, user is creator, or token invalid — re-render the page,
    // which will show the appropriate state.
    redirect(`/join/${token}`);
  }

  redirect(`/trips/${updated.id}`);
}

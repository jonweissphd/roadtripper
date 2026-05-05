import type { SupabaseClient, User } from "@supabase/supabase-js";

export const DEV_BYPASS_ENABLED =
  process.env.DEV_BYPASS_AUTH === "true" &&
  process.env.NODE_ENV !== "production";

const DEV_USER_ID =
  process.env.DEV_BYPASS_USER_ID || "00000000-0000-0000-0000-000000000000";
const DEV_USER_EMAIL = "dev@local.test";

const DEV_USER: User = {
  id: DEV_USER_ID,
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  email: DEV_USER_EMAIL,
  created_at: new Date(0).toISOString(),
  role: "authenticated",
};

export async function getCurrentUser(
  supabase: SupabaseClient,
): Promise<User | null> {
  if (DEV_BYPASS_ENABLED) return DEV_USER;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

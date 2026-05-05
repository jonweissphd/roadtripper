import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DEV_BYPASS_ENABLED } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createClient() {
  // Dev bypass: skip the JWT-bound SSR client and use the service-role admin
  // client so RLS doesn't block the fake user's reads/writes.
  if (DEV_BYPASS_ENABLED) {
    return createAdminClient();
  }

  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — middleware refreshes sessions.
          }
        },
      },
    },
  );
}

import type { SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { DEV_BYPASS_ENABLED } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMockClient, isMockMode } from "@/lib/supabase/mock";

export async function createClient() {
  // Dev fallback: no real Supabase project configured → in-memory mock with
  // seeded data so the app is browseable locally without an external backend.
  // Never engages in production (guarded by isMockMode).
  if (isMockMode()) {
    return createMockClient() as unknown as SupabaseClient;
  }

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

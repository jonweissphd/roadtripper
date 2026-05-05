import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(auth)/actions";
import { DEV_BYPASS_ENABLED, getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      {DEV_BYPASS_ENABLED && (
        <div className="bg-amber-500/20 px-6 py-1.5 text-center text-xs font-medium text-amber-900">
          DEV_BYPASS_AUTH is on — auth is faked. Unset before deploying.
        </div>
      )}
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3">
          <Link href="/profile" className="font-semibold">
            Detour
          </Link>
          {!DEV_BYPASS_ENABLED && (
            <form action={signOut}>
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Sign out
              </button>
            </form>
          )}
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

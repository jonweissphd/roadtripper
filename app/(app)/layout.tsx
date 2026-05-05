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
        <div className="border-b border-warning/30 bg-warning/15 px-6 py-1.5 text-center text-[0.6875rem] font-medium tracking-wide text-warning-foreground">
          DEV_BYPASS_AUTH is on — auth is faked. Unset before deploying.
        </div>
      )}
      <header className="border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-3.5">
          <Link
            href="/profile"
            className="text-[0.95rem] font-semibold tracking-[-0.01em] transition-colors hover:text-foreground/80"
          >
            Detour
          </Link>
          {!DEV_BYPASS_ENABLED && (
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
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

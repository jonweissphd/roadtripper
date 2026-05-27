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
      <header className="border-b border-border/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4 sm:px-8 sm:py-5">
          <Link
            href="/profile"
            className="text-[0.8125rem] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:text-foreground/70"
          >
            Detour
          </Link>
          <nav className="flex items-center gap-5">
            <Link
              href="/profile"
              className="text-[0.75rem] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Interests
            </Link>
            <Link
              href="/trips/new"
              className="text-[0.75rem] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
            >
              New trip
            </Link>
            {!DEV_BYPASS_ENABLED && (
              <form action={signOut}>
                <button
                  type="submit"
                  className="text-[0.75rem] font-medium uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </form>
            )}
          </nav>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

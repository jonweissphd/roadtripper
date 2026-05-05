import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (user) redirect("/profile");

  return (
    <main className="flex flex-1 flex-col px-6 py-10 sm:py-16">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col">
        <Link
          href="/"
          className="self-center text-sm font-medium tracking-[-0.01em] text-foreground/80 transition-colors hover:text-foreground"
        >
          Detour
        </Link>
        <div className="flex flex-1 items-center justify-center pt-10 sm:pt-14">
          <div className="w-full">{children}</div>
        </div>
      </div>
    </main>
  );
}

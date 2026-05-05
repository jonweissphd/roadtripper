import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { acceptInvite } from "./actions";

export default async function JoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  // Token possession IS the auth — read trip via service role.
  const admin = createAdminClient();
  const { data: trip } = await admin
    .from("trips")
    .select("id, creator_id, guest_id, origin_address, dest_address")
    .eq("invite_token", token)
    .maybeSingle();

  if (!trip) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-20 text-center">
        <Link
          href="/"
          className="text-sm font-medium tracking-[-0.01em] text-foreground/80 transition-colors hover:text-foreground"
        >
          Detour
        </Link>
        <div className="mt-12 space-y-3">
          <Eyebrow>Invite</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight">
            Invite not found
          </h1>
          <p className="text-sm text-muted-foreground">
            This invite link is invalid or has been removed.
          </p>
        </div>
      </main>
    );
  }

  // Look up creator's display name for the preview.
  const { data: creatorProfile } = await admin
    .from("profiles")
    .select("display_name")
    .eq("id", trip.creator_id)
    .maybeSingle();
  const creatorName = creatorProfile?.display_name ?? "Someone";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user && user.id === trip.creator_id) {
    redirect(`/trips/${trip.id}`);
  }

  if (trip.guest_id) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col items-center px-6 py-20 text-center">
        <Link
          href="/"
          className="text-sm font-medium tracking-[-0.01em] text-foreground/80 transition-colors hover:text-foreground"
        >
          Detour
        </Link>
        <div className="mt-12 space-y-3">
          <Eyebrow>Invite</Eyebrow>
          <h1 className="text-2xl font-semibold tracking-tight">
            Trip is full
          </h1>
          <p className="text-sm text-muted-foreground">
            Both seats on this trip are already taken.
          </p>
        </div>
        <Link
          href={user ? "/profile" : "/login"}
          className={buttonVariants({ variant: "outline", className: "mt-8" })}
        >
          {user ? "Back to your profile" : "Log in"}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col px-6 py-16 sm:py-20">
      <Link
        href="/"
        className="self-center text-sm font-medium tracking-[-0.01em] text-foreground/80 transition-colors hover:text-foreground"
      >
        Detour
      </Link>

      <div className="mt-14 space-y-4 text-center">
        <Eyebrow>Trip invite</Eyebrow>
        <h1 className="text-pretty text-[1.75rem] font-semibold leading-tight tracking-tight sm:text-3xl">
          <span className="font-semibold">{creatorName}</span>{" "}
          <span className="text-muted-foreground">invited you on a road trip</span>
        </h1>
      </div>

      <div className="mt-7 rounded-xl border border-border/70 bg-card px-5 py-5 text-center">
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              From
            </div>
            <div className="text-sm font-medium">{trip.origin_address}</div>
          </div>
          <div className="text-muted-foreground/70" aria-hidden>
            ↓
          </div>
          <div className="space-y-1">
            <div className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              To
            </div>
            <div className="text-sm font-medium">{trip.dest_address}</div>
          </div>
        </div>
      </div>

      {user ? (
        <form action={acceptInvite} className="mt-7 space-y-3">
          <input type="hidden" name="token" value={token} />
          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full">
            Accept invite
          </Button>
        </form>
      ) : (
        <div className="mt-7 space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Sign up or log in to accept.
          </p>
          <div className="flex gap-2">
            <Link
              href={`/signup?next=${encodeURIComponent(`/join/${token}`)}`}
              className={buttonVariants({
                size: "lg",
                className: "flex-1",
              })}
            >
              Sign up
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className: "flex-1",
              })}
            >
              Log in
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}

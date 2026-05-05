import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
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
      <main className="mx-auto max-w-md space-y-3 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Invite not found</h1>
        <p className="text-sm text-muted-foreground">
          This invite link is invalid or has been removed.
        </p>
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
      <main className="mx-auto max-w-md space-y-4 px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold">Trip is full</h1>
        <p className="text-sm text-muted-foreground">
          Both seats on this trip are already taken.
        </p>
        <Link
          href={user ? "/profile" : "/login"}
          className={buttonVariants({ variant: "outline" })}
        >
          {user ? "Back to your profile" : "Log in"}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md space-y-6 px-6 py-16">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Trip invite</h1>
        <p className="text-muted-foreground">
          <span className="text-foreground">{creatorName}</span> invited you on
          a road trip from{" "}
          <span className="text-foreground">{trip.origin_address}</span> to{" "}
          <span className="text-foreground">{trip.dest_address}</span>.
        </p>
      </div>

      {user ? (
        <form action={acceptInvite} className="space-y-3">
          <input type="hidden" name="token" value={token} />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full">
            Accept invite
          </Button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">Sign up or log in to accept.</p>
          <div className="flex gap-2">
            <Link
              href={`/signup?next=${encodeURIComponent(`/join/${token}`)}`}
              className={buttonVariants({ className: "flex-1" })}
            >
              Sign up
            </Link>
            <Link
              href={`/login?next=${encodeURIComponent(`/join/${token}`)}`}
              className={buttonVariants({
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

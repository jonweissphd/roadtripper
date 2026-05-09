import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InterestPicker,
  type Interest,
  type InterestGroup,
} from "@/components/interests/InterestPicker";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { saveProfile } from "./actions";

const MIN_INTERESTS_FOR_TRIP = 5;

const CATEGORY_ORDER = [
  "food",
  "drinks",
  "nightlife",
  "shopping",
  "outdoor",
  "fitness",
  "activities",
  "culture",
  "animals",
  "quirky",
];

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();
  const user = await getCurrentUser(supabase);
  if (!user) redirect("/login");

  const [profileRes, interestsRes, selectionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, locals_only")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("interests")
      .select("id, slug, label, category")
      .order("category")
      .order("label"),
    supabase
      .from("profile_interests")
      .select("interest_id")
      .eq("profile_id", user.id),
  ]);

  const profile = profileRes.data;
  const interests = (interestsRes.data ?? []) as Interest[];
  const selectedIds = (selectionsRes.data ?? []).map((r) => r.interest_id);

  const groups: InterestGroup[] = CATEGORY_ORDER.map((category) => ({
    category,
    interests: interests.filter((i) => i.category === category),
  })).filter((g) => g.interests.length > 0);

  const canStartTrip = selectedIds.length >= MIN_INTERESTS_FOR_TRIP;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 pb-8">
        <div className="space-y-2">
          <Eyebrow>Your profile</Eyebrow>
          <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">
            What do you love?
          </h1>
          <p className="text-[0.8125rem] text-muted-foreground">{user.email}</p>
        </div>
        {canStartTrip && (
          <Link href="#start" className={buttonVariants()}>
            Let&apos;s go
          </Link>
        )}
      </div>

      <form action={saveProfile} className="space-y-10">
        <section className="space-y-2.5">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            name="display_name"
            required
            defaultValue={profile?.display_name ?? ""}
            placeholder="What should your travel buddy call you?"
          />
          <p className="text-xs text-muted-foreground">
            Your travel buddy sees this when you go on a trip together.
          </p>
        </section>

        <section className="space-y-4">
          <div className="space-y-1">
            <Label className="text-base font-semibold tracking-tight">
              Interests
            </Label>
            <p className="text-sm text-muted-foreground">
              Pick the kinds of stops you enjoy. We&apos;ll match these against
              your travel buddy&apos;s.
            </p>
          </div>
          <InterestPicker groups={groups} initial={selectedIds} />
        </section>

        <section className="rounded-xl border border-border/70 bg-card p-5">
          <label className="flex cursor-pointer items-start gap-4">
            <input
              type="checkbox"
              name="locals_only"
              value="1"
              defaultChecked={profile?.locals_only ?? false}
              className="mt-0.5 size-5 rounded border-border accent-primary"
            />
            <div className="space-y-1">
              <span className="text-sm font-semibold tracking-tight">
                Locals only
              </span>
              <p className="text-sm text-muted-foreground">
                Skip the chains. Only show local, independent, mom &amp; pop
                spots — the places that make a town special.
              </p>
            </div>
          </label>
        </section>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {saved && !canStartTrip && (
          <p className="rounded-md bg-success/12 px-3 py-2 text-sm text-success">
            Saved. Pick at least {MIN_INTERESTS_FOR_TRIP} interests to get started.
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="submit" size="lg" variant="outline">
            Save profile
          </Button>
          {canStartTrip && (
            <Link
              href="/trips/new"
              className={buttonVariants({
                size: "lg",
                className: "text-[0.9375rem]",
              })}
            >
              Let&apos;s Detour →
            </Link>
          )}
        </div>
      </form>

      {canStartTrip && (
        <section
          id="start"
          className="mt-12 space-y-5 rounded-2xl border-2 border-primary/25 bg-primary/[0.06] p-6 sm:p-8"
        >
          {saved && (
            <div className="rounded-lg bg-primary/15 px-4 py-2.5 text-sm font-medium text-primary">
              ✓ Profile saved!
            </div>
          )}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold tracking-tight sm:text-[1.375rem]">
              Ready? Pick your adventure.
            </h2>
            <p className="text-sm text-muted-foreground">
              Your interests are locked in. Where to next?
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link
              href="/trips/new"
              className={buttonVariants({
                size: "lg",
                className:
                  "h-auto flex-col gap-0.5 py-4 text-[0.9375rem] sm:px-8",
              })}
            >
              <span>🚗 Plan a road trip</span>
              <span className="text-xs font-normal text-primary-foreground/70">
                Start + destination
              </span>
            </Link>
            <Link
              href="/explore/new"
              className={buttonVariants({
                size: "lg",
                variant: "outline",
                className:
                  "h-auto flex-col gap-0.5 border-2 border-primary/30 py-4 text-[0.9375rem] hover:border-primary/50 hover:bg-primary/5 sm:px-8",
              })}
            >
              <span>📍 Explore an area</span>
              <span className="text-xs font-normal text-muted-foreground">
                City or zip code
              </span>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

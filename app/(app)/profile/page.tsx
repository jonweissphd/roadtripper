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
  "shopping",
  "outdoor",
  "activities",
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
      .select("display_name")
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
          <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
            Tell us about you
          </h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        {canStartTrip && (
          <Link href="/trips/new" className={buttonVariants()}>
            New trip
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

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {saved && (
          <p className="rounded-md bg-success/12 px-3 py-2 text-sm text-success">
            Saved.
          </p>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" size="lg">
            Save profile
          </Button>
        </div>
      </form>
    </main>
  );
}

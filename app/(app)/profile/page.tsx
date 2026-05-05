import Link from "next/link";
import { redirect } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
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
    <main className="mx-auto w-full max-w-2xl space-y-8 px-6 py-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your profile</h1>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
        {canStartTrip && (
          <Link
            href="/trips/new"
            className={buttonVariants({ size: "default" })}
          >
            New trip
          </Link>
        )}
      </div>

      <form action={saveProfile} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="display_name">Display name</Label>
          <Input
            id="display_name"
            name="display_name"
            required
            defaultValue={profile?.display_name ?? ""}
            placeholder="What should your travel buddy call you?"
          />
          <p className="text-xs text-muted-foreground">
            Your travel buddy will see this when you go on a trip together.
          </p>
        </div>

        <div className="space-y-3">
          <Label>Interests</Label>
          <InterestPicker groups={groups} initial={selectedIds} />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {saved && <p className="text-sm text-emerald-700">Saved.</p>}

        <Button type="submit">Save profile</Button>
      </form>
    </main>
  );
}

import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { AddressAutocomplete } from "@/components/trips/AddressAutocomplete";
import { createExplore } from "./actions";

export default async function NewExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12 sm:py-16">
      <div className="space-y-3 pb-10">
        <Eyebrow>Explore an area</Eyebrow>
        <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">
          Where are you?
        </h1>
        <p className="max-w-[44ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
          Enter a city, zip code, or neighborhood. We&apos;ll find the best
          things to do nearby based on your interests.
        </p>
      </div>

      <form action={createExplore} className="space-y-8">
        <AddressAutocomplete name="location" label="City or area" />

        {error && (
          <p className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="pt-3">
          <Button type="submit" size="lg" className="text-[0.9375rem] sm:px-8">
            Explore this area
          </Button>
        </div>
      </form>
    </main>
  );
}

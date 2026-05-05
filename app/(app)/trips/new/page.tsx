import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { AddressAutocomplete } from "@/components/trips/AddressAutocomplete";
import { createTrip } from "./actions";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12 sm:py-16">
      <div className="space-y-3 pb-9">
        <Eyebrow>New trip</Eyebrow>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-[2rem]">
          Where are you headed?
        </h1>
        <p className="max-w-[42ch] text-sm text-muted-foreground sm:text-base">
          Pick where you&apos;re leaving from and where you&apos;re heading.
          Once your travel buddy joins, we&apos;ll find places along the route
          you&apos;ll both love.
        </p>
      </div>

      <form action={createTrip} className="space-y-7">
        <AddressAutocomplete name="origin" label="Start" />
        <AddressAutocomplete name="dest" label="Destination" />

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="pt-2">
          <Button type="submit" size="lg">
            Create trip
          </Button>
        </div>
      </form>
    </main>
  );
}

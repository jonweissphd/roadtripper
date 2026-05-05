import { Button } from "@/components/ui/button";
import { AddressAutocomplete } from "@/components/trips/AddressAutocomplete";
import { createTrip } from "./actions";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 px-6 py-12">
      <div>
        <h1 className="text-2xl font-semibold">New trip</h1>
        <p className="text-sm text-muted-foreground">
          Pick where you&apos;re leaving from and where you&apos;re heading.
          Once your travel buddy joins, we&apos;ll find places along the route
          you&apos;ll both love.
        </p>
      </div>

      <form action={createTrip} className="space-y-6">
        <AddressAutocomplete name="origin" label="Start" />
        <AddressAutocomplete name="dest" label="Destination" />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit">Create trip</Button>
      </form>
    </main>
  );
}

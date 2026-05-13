import { Eyebrow } from "@/components/ui/eyebrow";
import { NewTripForm } from "./NewTripForm";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; mode?: string }>;
}) {
  const { error, mode } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-xl px-6 py-12 sm:py-16">
      <div className="space-y-3 pb-10">
        <Eyebrow>New adventure</Eyebrow>
        <h1 className="text-[1.75rem] font-semibold tracking-tight sm:text-[2rem]">
          Where are you headed?
        </h1>
        <p className="max-w-[44ch] text-[0.9375rem] leading-relaxed text-muted-foreground">
          Plan a road trip or explore what&apos;s around you.
        </p>
      </div>

      <NewTripForm error={error} initialMode={mode === "explore" ? "explore" : "roadtrip"} />
    </main>
  );
}

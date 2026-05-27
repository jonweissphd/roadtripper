import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { signInAsGuest } from "@/app/(auth)/actions";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-24 sm:py-32">
      <div className="w-full max-w-lg space-y-16 text-center">
        <div className="space-y-6">
          <p className="text-[0.625rem] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Road trips, reimagined
          </p>
          <h1 className="text-balance text-[3rem] font-bold leading-[1.02] tracking-[-0.035em] sm:text-[4rem]">
            Detour
          </h1>
          <p className="mx-auto max-w-[32ch] text-pretty text-base leading-relaxed text-muted-foreground sm:text-[1.0625rem]">
            Pick the things you love. We find the hidden gems along your route
            — solo or with a travel buddy.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className={buttonVariants({
              size: "lg",
              className: "text-[0.9375rem] sm:min-w-[10rem]",
            })}
          >
            Get started
          </Link>
          <Link
            href="/login"
            className={buttonVariants({
              size: "lg",
              variant: "outline",
              className: "text-[0.9375rem] sm:min-w-[10rem]",
            })}
          >
            Sign in
          </Link>
        </div>

        <div className="space-y-4">
          <form action={signInAsGuest}>
            <button
              type="submit"
              className="text-sm font-medium text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/50"
            >
              Continue as guest
            </button>
          </form>
          <p className="text-xs tracking-wide text-muted-foreground/60">
            Free forever. No credit card.
          </p>
        </div>
      </div>
    </main>
  );
}

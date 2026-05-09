import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { signInAsGuest } from "@/app/(auth)/actions";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-lg space-y-12 text-center">
        <div className="space-y-5">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-3xl sm:size-20 sm:text-4xl">
            🗺️
          </div>
          <h1 className="text-balance text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[3.5rem]">
            Detour
          </h1>
          <p className="mx-auto max-w-[34ch] text-pretty text-[1.0625rem] leading-relaxed text-muted-foreground sm:text-lg">
            Plan a road trip or explore a new city. Pick what you love, and
            we&apos;ll find the best spots — solo or with a buddy.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className={buttonVariants({
              size: "lg",
              className: "text-[0.9375rem] sm:px-8",
            })}
          >
            Get started
          </Link>
          <Link
            href="/login"
            className={buttonVariants({
              size: "lg",
              variant: "outline",
              className: "text-[0.9375rem] sm:px-8",
            })}
          >
            I have an account
          </Link>
        </div>
        <form action={signInAsGuest}>
          <button
            type="submit"
            className="text-sm font-medium text-muted-foreground underline decoration-muted-foreground/30 underline-offset-4 transition-colors hover:text-foreground hover:decoration-foreground/50"
          >
            Continue as guest
          </button>
        </form>
        <p className="text-sm text-muted-foreground/70">
          Free to use. No credit card needed.
        </p>
      </div>
    </main>
  );
}

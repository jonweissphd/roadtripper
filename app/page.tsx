import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-20">
      <div className="w-full max-w-md space-y-10 text-center">
        <div className="space-y-4">
          <Eyebrow>For two travelers</Eyebrow>
          <h1 className="text-balance text-[3.25rem] font-medium leading-[1.02] tracking-[-0.03em] sm:text-6xl">
            Detour
          </h1>
          <p className="mx-auto max-w-[28ch] text-pretty text-base text-muted-foreground sm:text-lg">
            Find places along your road trip you&apos;ll both love.
          </p>
        </div>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Link
            href="/signup"
            className={buttonVariants({ size: "lg", className: "sm:px-7" })}
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className={buttonVariants({
              size: "lg",
              variant: "outline",
              className: "sm:px-7",
            })}
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}

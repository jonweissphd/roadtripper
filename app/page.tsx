import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="space-y-3">
          <h1 className="text-5xl font-semibold tracking-tight">Detour</h1>
          <p className="text-lg text-muted-foreground">
            Find places along your road trip you&apos;ll both love.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/signup" className={buttonVariants({ size: "lg" })}>
            Sign up
          </Link>
          <Link
            href="/login"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Log in
          </Link>
        </div>
      </div>
    </main>
  );
}

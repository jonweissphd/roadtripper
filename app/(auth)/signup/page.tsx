import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAsGuest, signUp } from "../actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const loginHref = next
    ? `/login?next=${encodeURIComponent(next)}`
    : "/login";

  return (
    <div className="space-y-8">
      <div className="space-y-2 text-center">
        <Eyebrow>Get started</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your account
        </h1>
      </div>

      <form action={signUp} className="space-y-5">
        {next && <input type="hidden" name="next" value={next} />}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
          />
          <p className="text-xs text-muted-foreground">
            At least 6 characters.
          </p>
        </div>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full">
          Sign up
        </Button>
      </form>

      <div className="relative flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium text-muted-foreground">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form action={signInAsGuest}>
        {next && <input type="hidden" name="next" value={next} />}
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="w-full"
        >
          Continue as guest
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href={loginHref}
          className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}

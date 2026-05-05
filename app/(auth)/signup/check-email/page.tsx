import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-3">
        <Eyebrow>Almost there</Eyebrow>
        <h1 className="text-2xl font-semibold tracking-tight">
          Check your email
        </h1>
        <p className="mx-auto max-w-[34ch] text-sm text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="font-medium text-foreground">
            {email ?? "your inbox"}
          </span>
          . Open it to finish signing up.
        </p>
      </div>
      <p className="text-xs text-muted-foreground">
        Didn&apos;t get it? Check your spam folder, or{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline decoration-foreground/30 underline-offset-4 transition-colors hover:decoration-foreground"
        >
          try again
        </Link>
        .
      </p>
    </div>
  );
}

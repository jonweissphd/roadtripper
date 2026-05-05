import Link from "next/link";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="space-y-4 text-center">
      <h1 className="text-2xl font-semibold">Check your email</h1>
      <p className="text-sm text-muted-foreground">
        We sent a confirmation link to{" "}
        <span className="text-foreground">{email ?? "your inbox"}</span>. Click
        it to finish signing up.
      </p>
      <p className="text-xs text-muted-foreground">
        Didn&apos;t get it? Check spam, or{" "}
        <Link
          href="/signup"
          className="text-foreground underline underline-offset-4"
        >
          try again
        </Link>
        .
      </p>
    </div>
  );
}

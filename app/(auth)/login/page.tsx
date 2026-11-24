import { redirect } from "next/navigation";

// V1 is guest-only — there are no accounts to log into. Anyone landing here
// (old bookmark, stale link) is sent to the guest entry.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  redirect(next ? `/auth/guest?next=${encodeURIComponent(next)}` : "/auth/guest");
}

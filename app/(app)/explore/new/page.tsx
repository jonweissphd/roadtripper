import { redirect } from "next/navigation";

export default async function NewExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const params = new URLSearchParams({ mode: "explore" });
  if (error) params.set("error", error);
  redirect(`/trips/new?${params.toString()}`);
}

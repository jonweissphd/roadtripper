import { NextResponse } from "next/server";
import { DEV_BYPASS_ENABLED } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/profile";
  }
  return value;
}

// Guest-only entry point. Creates an anonymous Supabase session and drops the
// visitor into the app — no email, no password, no account. This is the single
// front door for V1; the pairing flow relies on each guest having a distinct
// anonymous user id so creator and joiner stay separate.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = safeNext(searchParams.get("next"));

  // Dev bypass already fakes a signed-in user, so there's nothing to create.
  if (DEV_BYPASS_ENABLED) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInAnonymously();
  if (error) {
    return NextResponse.redirect(
      `${origin}/?error=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}

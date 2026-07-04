import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-redirect";

// Handles the redirect from Supabase email confirmation / OAuth, exchanging the
// auth code for a session cookie before sending the user on. The `next` value is
// attacker-controlled, so it is normalised to a safe, same-origin app path
// (defaulting to /dashboard) to prevent an open redirect off the site.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
    return NextResponse.redirect(new URL(`/auth/sign-in?error=${encodeURIComponent(error.message)}`, origin));
  }

  return NextResponse.redirect(new URL(`/auth/sign-in?error=${encodeURIComponent("Missing authentication code.")}`, origin));
}

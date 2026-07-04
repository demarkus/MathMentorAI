import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/learner", "/parent", "/teacher", "/admin"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data } = await supabase.auth.getClaims();
  const pathname = request.nextUrl.pathname;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (isProtected && !data?.claims) {
    const destination = request.nextUrl.clone();
    // Carry the full intended local destination (path + its own query) so the
    // learner returns exactly where they were headed after signing in. This is
    // re-validated by safeNextPath in the login action before any redirect.
    const intended = `${pathname}${request.nextUrl.search}`;
    destination.pathname = "/auth/sign-in";
    destination.search = "";
    destination.searchParams.set("next", intended);
    return NextResponse.redirect(destination);
  }
  // Authenticated, per-user areas must never be cached by the browser or a shared
  // cache/CDN — they render account-specific data behind auth.
  if (isProtected) {
    response.headers.set("Cache-Control", "private, no-store, max-age=0, must-revalidate");
  }
  return response;
}

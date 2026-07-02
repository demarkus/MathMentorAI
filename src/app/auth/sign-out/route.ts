import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

async function signOutAndRedirect(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/auth/sign-in", request.url), { status: 303 });
}

export async function POST(request: Request) {
  return signOutAndRedirect(request);
}

// Supports direct navigation and the compatibility redirect from /auth/signout.
export async function GET(request: Request) {
  return signOutAndRedirect(request);
}

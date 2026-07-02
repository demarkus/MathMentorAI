import { NextResponse } from "next/server";

// Backward-compatible alias: the canonical sign-out route is /auth/sign-out.
export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/auth/sign-out", request.url), {
    status: 307,
  });
}

export async function POST(request: Request) {
  return NextResponse.redirect(new URL("/auth/sign-out", request.url), {
    status: 307,
  });
}
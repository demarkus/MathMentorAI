"use server";

import { headers } from "next/headers";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isBetaRole, isPlanId } from "@/lib/marketing/plans";

export type BetaLeadInput = {
  full_name: string;
  email: string;
  phone: string;
  role: string;
  selected_plan: string;
  message: string;
};

export type BetaLeadResult = { ok?: boolean; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Server-side length caps (mirrored by the DB constraint + submit function).
const MAX = { name: 120, email: 254, phone: 40, plan: 64, message: 2000 };

/**
 * Server-derived client IP for anti-abuse rate limiting.
 *
 * TRUST BOUNDARY: `x-forwarded-for` / `x-real-ip` are only trustworthy when the
 * app sits behind a proxy/CDN that OVERWRITES them with the real client IP (e.g.
 * Vercel, Cloudflare). Without such a proxy a client could spoof the header, so
 * the value must be treated as untrusted. Either way the IP is derived here on
 * the server and passed to the (now service-role-only) RPC — an anonymous Data
 * API caller can no longer supply `p_ip` directly. The safe fallback is null, in
 * which case the DB still enforces the per-email rate limit and dedup.
 */
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : h.get("x-real-ip") ?? "").trim();
  return ip || null;
}

/**
 * Persists a public beta sign-up. The trusted submit_beta_lead() function is now
 * service-role-only, so this calls it via the service-role client (never the anon
 * session). The function validates input, enforces the canonical plan allow-list,
 * rate-limits (per email/IP, advisory-locked), and suppresses duplicates
 * (per email+plan, via a unique index) — all concurrency-safe. Inputs are also
 * validated here for friendly errors.
 */
export async function submitBetaLead(input: BetaLeadInput): Promise<BetaLeadResult> {
  const full_name = String(input?.full_name ?? "").trim();
  if (!full_name) return { error: "Please enter your full name." };
  if (full_name.length > MAX.name) return { error: "Please shorten your name." };

  const email = String(input?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > MAX.email) return { error: "Please enter a valid email address." };

  const role = String(input?.role ?? "");
  if (!isBetaRole(role)) return { error: "Please choose who you are." };

  const selected_plan = String(input?.selected_plan ?? "").trim();
  if (!isPlanId(selected_plan) || selected_plan.length > MAX.plan) return { error: "Please choose a valid plan." };

  const phone = String(input?.phone ?? "").trim();
  if (phone.length > MAX.phone) return { error: "Please shorten your phone number." };

  const message = String(input?.message ?? "").trim();
  if (message.length > MAX.message) return { error: "Please shorten your message (2000 characters max)." };

  const ip = await clientIp();
  const admin = createServiceRoleClient();
  if (!admin) {
    return { error: "We couldn’t submit your request just now. Please try again in a moment." };
  }
  const { data, error } = await admin.rpc("submit_beta_lead", {
    p_full_name: full_name,
    p_email: email,
    p_role: role,
    p_selected_plan: selected_plan,
    p_phone: phone || null,
    p_message: message || null,
    p_ip: ip,
  });

  if (error) {
    return { error: "We couldn’t submit your request just now. Please try again in a moment." };
  }
  const status = String(data ?? "");
  if (status === "rate_limited") {
    return { error: "You’ve submitted a few times already. Please try again in a little while." };
  }
  if (status === "invalid_plan") {
    return { error: "Please choose a valid plan." };
  }
  // 'ok' (new) and 'duplicate' (already have this request) both present as success.
  return { ok: true };
}

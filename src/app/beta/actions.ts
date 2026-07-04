"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
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

/** Best-effort client IP for anti-abuse. Behind a proxy/CDN use x-forwarded-for. */
async function clientIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  const ip = (forwarded ? forwarded.split(",")[0] : h.get("x-real-ip") ?? "").trim();
  return ip || null;
}

/**
 * Persists a public beta sign-up. Runs under the anon/authenticated session (no
 * service role), calling the trusted submit_beta_lead() function, which validates
 * input, rate-limits (per email/IP), and suppresses duplicates (per email+plan)
 * server-side. Direct inserts to beta_leads are revoked, so the checks can't be
 * bypassed. Inputs are also validated here for friendly errors.
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
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_beta_lead", {
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
  if (String(data ?? "") === "rate_limited") {
    return { error: "You’ve submitted a few times already. Please try again in a little while." };
  }
  // 'ok' (new) and 'duplicate' (already have this request) both present as success.
  return { ok: true };
}

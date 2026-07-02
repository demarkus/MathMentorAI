"use server";

import { createClient } from "@/lib/supabase/server";
import { isBetaRole } from "@/lib/marketing/plans";

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

/**
 * Persists a public beta sign-up. Runs under the anon/authenticated session
 * (never the service role), so the RLS insert policy on beta_leads applies and
 * no privileged key is involved. Inputs are validated server-side.
 */
export async function submitBetaLead(input: BetaLeadInput): Promise<BetaLeadResult> {
  const full_name = String(input?.full_name ?? "").trim();
  if (!full_name) return { error: "Please enter your full name." };

  const email = String(input?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };

  const role = String(input?.role ?? "");
  if (!isBetaRole(role)) return { error: "Please choose who you are." };

  const selected_plan = String(input?.selected_plan ?? "").trim();
  if (!selected_plan) return { error: "Please choose a plan." };

  const phone = String(input?.phone ?? "").trim();
  const message = String(input?.message ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.from("beta_leads").insert({
    full_name,
    email,
    phone: phone || null,
    role,
    selected_plan,
    message: message || null,
  });

  if (error) {
    return { error: "We couldn’t submit your request just now. Please try again in a moment." };
  }
  return { ok: true };
}

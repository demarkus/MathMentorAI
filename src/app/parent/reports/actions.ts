"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export type LinkActionResult = { ok?: boolean; error?: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Server-side length cap (mirrored by the DB check constraint).
const MAX_EMAIL = 254;

/** Postgres unique-violation, surfaced when this parent already invited this email. */
const UNIQUE_VIOLATION = "23505";

/**
 * Invites a learner by email: inserts a pending parent_learner_links row for
 * the signed-in parent. Runs under the parent's own session, so RLS enforces
 * that parent_id is the caller and that the caller actually holds the parent
 * role — the service role is never involved. The link grants nothing until the
 * learner accepts it from their dashboard.
 */
export async function inviteLearner(email: string): Promise<LinkActionResult> {
  const user = await requireRole("parent");

  const normalized = String(email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(normalized) || normalized.length > MAX_EMAIL) {
    return { error: "Please enter a valid email address." };
  }
  const ownEmails = [user.email, user.profile?.email]
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.toLowerCase());
  if (ownEmails.includes(normalized)) {
    return { error: "That’s your own email — enter your learner’s email address." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("parent_learner_links")
    .insert({ parent_id: user.id, learner_email: normalized });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { error: "You’ve already sent a request to this email. Remove the existing link to send a new one." };
    }
    return { error: "We couldn’t send this link request just now. Please try again in a moment." };
  }

  revalidatePath("/parent/reports");
  return { ok: true };
}

/**
 * Removes a link (pending, accepted, or rejected), immediately revoking any
 * report access it granted. Runs under the parent's session; the id is scoped
 * to the caller both here and by RLS, so a parent can only ever delete their
 * own links.
 */
export async function removeLearnerLink(linkId: string): Promise<LinkActionResult> {
  const user = await requireRole("parent");

  const id = String(linkId ?? "").trim();
  if (!UUID_RE.test(id)) return { error: "That link could not be found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_learner_links")
    .delete()
    .eq("id", id)
    .eq("parent_id", user.id)
    .select("id");

  if (error) return { error: "We couldn’t remove this link just now. Please try again in a moment." };
  if (!data || data.length === 0) return { error: "That link could not be found." };

  revalidatePath("/parent/reports");
  return { ok: true };
}

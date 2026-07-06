"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";

export type InvitationActionResult = { ok?: boolean; error?: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Accepts or rejects a pending parent link request. Runs under the learner's
 * own session: RLS only lets a learner update links addressed to their profile
 * email, only to a decided status, and only binding learner_id to themselves —
 * so the update below cannot touch anyone else's invitation even if the id is
 * guessed. learner_id resolves to the authenticated learner's profile (their
 * auth uid), which is what grants the parent report access on acceptance.
 */
export async function respondToInvitation(linkId: string, accept: boolean): Promise<InvitationActionResult> {
  const user = await requireRole("learner");

  const id = String(linkId ?? "").trim();
  if (!UUID_RE.test(id)) return { error: "That invitation could not be found." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_learner_links")
    .update({ status: accept ? "accepted" : "rejected", learner_id: user.id })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");

  if (error) return { error: "We couldn’t save your response just now. Please try again in a moment." };
  if (!data || data.length === 0) return { error: "That invitation is no longer available." };

  revalidatePath("/learner");
  revalidatePath("/parent/reports");
  return { ok: true };
}

"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : undefined;
  if (!userId) redirect("/auth/sign-in");

  const role = String(formData.get("role")) as Role;
  const grade = Number(formData.get("grade"));

  // Authenticated users cannot INSERT into public.profiles (no grant/policy),
  // so use the service role client to create-or-update the row. Fall back to a
  // plain update if the service key is not configured.
  const admin = createServiceRoleClient();
  const { error } = admin && email
    ? await admin.from("profiles").upsert({ id: userId, email, role }, { onConflict: "id" })
    : await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);

  if (role === "student") {
    const { error: learnerError } = await supabase.from("learner_profiles").upsert({ user_id: userId, grade });
    if (learnerError) redirect(`/onboarding?error=${encodeURIComponent(learnerError.message)}`);
  }
  redirect("/dashboard");
}

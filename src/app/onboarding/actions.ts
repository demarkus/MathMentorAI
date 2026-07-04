"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Only these roles may be self-selected at onboarding; admin is provisioned
// out-of-band. The trusted complete_onboarding() function re-validates this
// server-side and refuses to change a role that is already set.
const ONBOARDING_ROLES = new Set(["student", "parent", "teacher"]);
const VALID_GRADES = new Set([9, 10]);

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) redirect("/auth/sign-in");

  const role = String(formData.get("role") ?? "");
  const grade = Number(formData.get("grade"));

  // Defence in depth — the function enforces these again inside the transaction.
  if (!ONBOARDING_ROLES.has(role)) {
    redirect(`/onboarding?error=${encodeURIComponent("Please choose a valid role.")}`);
  }
  if (role === "student" && !VALID_GRADES.has(grade)) {
    redirect(`/onboarding?error=${encodeURIComponent("Please choose Grade 9 or Grade 10.")}`);
  }

  // Trusted, atomic provisioning via a security-definer function. No service-role
  // client and no direct role write from the browser session: the function
  // validates the role/grade and sets the role only when it is not already set.
  const { error } = await supabase.rpc("complete_onboarding", {
    p_role: role,
    p_grade: role === "student" ? grade : null,
  });
  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent("We couldn’t save your details. Please try again.")}`);
  }

  redirect(role === "student" ? "/learner/diagnostic" : "/dashboard");
}

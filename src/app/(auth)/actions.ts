"use server";

import { redirect } from "next/navigation";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

// The sign-up form offers app-facing role labels. "learner" is stored as the
// "student" value defined by the public.user_role enum; the rest map directly.
//
// Security: the public form must NOT be able to self-assign "admin" — that role
// grants question-bank management via the service-role client. Admins are
// provisioned out-of-band (directly in the database), so "admin" is deliberately
// absent here and any admin (or unknown) value falls back to "student".
const PUBLIC_SIGNUP_ROLES: Record<string, Role> = {
  learner: "student",
  student: "student",
  parent: "parent",
  teacher: "teacher",
};

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/auth/sign-in?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const fullName = String(formData.get("fullName"));
  const role = PUBLIC_SIGNUP_ROLES[String(formData.get("role") || "learner")] ?? "student";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });
  if (error) redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);

  // Provision the profile row. RLS/grants block authenticated inserts on
  // public.profiles, so this uses the service role client (server-only).
  const userId = data.user?.id;
  if (userId) {
    const admin = createServiceRoleClient();
    if (admin) {
      await admin
        .from("profiles")
        .upsert({ id: userId, email, full_name: fullName, role }, { onConflict: "id" });
    }
  }

  // No session means email confirmation is required.
  if (!data.session) redirect("/auth/sign-in?message=Check your email to confirm your account.");

  // Learners finish onboarding to set their grade; other roles go straight in.
  redirect(role === "student" ? "/onboarding" : "/dashboard");
}

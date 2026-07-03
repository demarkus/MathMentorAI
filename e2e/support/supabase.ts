import { createClient } from "@supabase/supabase-js";

/**
 * Support for the gated auth E2E journeys. Talks to a dedicated test Supabase
 * project via E2E_SUPABASE_* (the same project the app server is pointed at by
 * playwright.config.ts when those vars are set). Users are provisioned CONFIRMED
 * via the service-role admin API so sign-in works without a real mailbox and
 * production email-confirmation stays on.
 */
const url = process.env.E2E_SUPABASE_URL;
const anon = process.env.E2E_SUPABASE_ANON_KEY;
const service = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;

export const hasE2eSupabase = Boolean(url && anon && service);

function serviceClient() {
  return createClient(url!, service!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type ProvisionedUser = { id: string; email: string; password: string };
export type ProvisionRole = "student" | "teacher" | "admin" | null;

let seq = 0;

/**
 * Creates a confirmed user. A non-null role is written to profiles (learners
 * also get a learner_profiles row); a null role leaves the trigger-created
 * profile role empty so the app routes the user to onboarding.
 */
export async function provisionUser(opts: { role: ProvisionRole; grade?: number }): Promise<ProvisionedUser> {
  const svc = serviceClient();
  seq += 1;
  const email = `e2e-${opts.role ?? "norole"}-${Date.now()}-${seq}@mathmentor.test`;
  const password = "Test-Passw0rd!";

  const created = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E User" },
  });
  if (created.error || !created.data.user) throw new Error(`admin.createUser failed: ${created.error?.message}`);
  const id = created.data.user.id;

  if (opts.role) {
    const profile = await svc
      .from("profiles")
      .upsert({ id, email, full_name: "E2E User", role: opts.role }, { onConflict: "id" });
    if (profile.error) throw new Error(`profiles upsert failed: ${profile.error.message}`);
    if (opts.role === "student") {
      const learner = await svc.from("learner_profiles").upsert({ user_id: id, grade: opts.grade ?? 9 });
      if (learner.error) throw new Error(`learner_profiles upsert failed: ${learner.error.message}`);
    }
  }

  return { id, email, password };
}

/** Best-effort teardown — deleting the auth user cascades to owned rows. */
export async function deleteUser(id: string): Promise<void> {
  await serviceClient()
    .auth.admin.deleteUser(id)
    .catch(() => undefined);
}

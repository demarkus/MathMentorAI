import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Shared setup for the RLS/integration suite. These helpers talk to a LIVE,
 * dedicated test Supabase project via a distinct set of env vars so they can
 * NEVER accidentally hit the app's normal (possibly production) project:
 *
 *   INTEGRATION_SUPABASE_URL
 *   INTEGRATION_SUPABASE_ANON_KEY
 *   INTEGRATION_SUPABASE_SERVICE_ROLE_KEY
 *
 * When any are missing, `hasIntegrationEnv` is false and the suites skip.
 */
const url = process.env.INTEGRATION_SUPABASE_URL;
const anonKey = process.env.INTEGRATION_SUPABASE_ANON_KEY;
const serviceKey = process.env.INTEGRATION_SUPABASE_SERVICE_ROLE_KEY;

export const hasIntegrationEnv = Boolean(url && anonKey && serviceKey);

/** Service-role client — bypasses RLS. Used only to provision/clean up fixtures. */
export function serviceClient(): SupabaseClient {
  return createClient(url!, serviceKey!, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Anonymous client (anon key, no session) — subject to RLS as `anon`. */
export function anonClient(): SupabaseClient {
  return createClient(url!, anonKey!, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type AppRole = "student" | "teacher" | "admin" | "parent";
export type TestUser = { id: string; email: string; password: string; role: AppRole };

let seq = 0;
function uniqueEmail(role: AppRole): string {
  seq += 1;
  return `it-${role}-${Date.now()}-${seq}@mathmentor.test`;
}

/**
 * Creates a confirmed auth user (so sign-in works without a real mailbox) and
 * sets their profile role. Learners also get a learner_profiles row. Returns the
 * credentials for signing in as that user.
 */
export async function createTestUser(role: AppRole, opts?: { grade?: number }): Promise<TestUser> {
  const svc = serviceClient();
  const email = uniqueEmail(role);
  const password = "Test-Passw0rd!";

  const created = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `IT ${role}` },
  });
  if (created.error || !created.data.user) {
    throw new Error(`admin.createUser failed: ${created.error?.message}`);
  }
  const id = created.data.user.id;

  // The handle_new_user trigger inserts a profiles row with a null role; set it.
  const profile = await svc
    .from("profiles")
    .upsert({ id, email, full_name: `IT ${role}`, role }, { onConflict: "id" });
  if (profile.error) throw new Error(`profiles upsert failed: ${profile.error.message}`);

  if (role === "student") {
    const learner = await svc.from("learner_profiles").upsert({ user_id: id, grade: opts?.grade ?? 9 });
    if (learner.error) throw new Error(`learner_profiles upsert failed: ${learner.error.message}`);
  }

  return { id, email, password, role };
}

/** Signs in as a test user and returns an RLS-scoped client carrying their JWT. */
export async function signInAs(user: TestUser): Promise<SupabaseClient> {
  const client = anonClient();
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw new Error(`signInWithPassword failed: ${error.message}`);
  return client;
}

/** Looks up a learner's learner_profiles id (service-role). */
export async function learnerProfileId(userId: string): Promise<string> {
  const svc = serviceClient();
  const { data, error } = await svc.from("learner_profiles").select("id").eq("user_id", userId).single();
  if (error || !data) throw new Error(`learner_profiles lookup failed: ${error?.message}`);
  return (data as { id: string }).id;
}

/** Best-effort teardown — deleting the auth user cascades to owned rows. */
export async function deleteTestUsers(...users: (TestUser | undefined)[]): Promise<void> {
  const svc = serviceClient();
  for (const user of users) {
    if (user) await svc.auth.admin.deleteUser(user.id).catch(() => undefined);
  }
}

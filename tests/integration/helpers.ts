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
export type TestUser = { id: string; email: string; password: string; role: AppRole | null };

let seq = 0;
function uniqueEmail(role: AppRole | null): string {
  seq += 1;
  return `it-${role ?? "norole"}-${Date.now()}-${seq}@mathmentor.test`;
}

/**
 * Creates a confirmed auth user (so sign-in works without a real mailbox). A
 * non-null role is written to the profile (students also get a learner_profiles
 * row); a null role is left as the trigger created it (role unset), so the
 * onboarding function can be exercised from a clean state.
 */
export async function createTestUser(role: AppRole | null, opts?: { grade?: number }): Promise<TestUser> {
  const svc = serviceClient();
  const label = role ?? "unroled";
  const email = uniqueEmail(role);
  const password = "Test-Passw0rd!";

  const created = await svc.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `IT ${label}` },
  });
  if (created.error || !created.data.user) {
    throw new Error(`admin.createUser failed: ${created.error?.message}`);
  }
  const id = created.data.user.id;

  // The handle_new_user trigger inserts a profiles row with a null role.
  if (role) {
    const profile = await svc
      .from("profiles")
      .upsert({ id, email, full_name: `IT ${label}`, role }, { onConflict: "id" });
    if (profile.error) throw new Error(`profiles upsert failed: ${profile.error.message}`);

    if (role === "student") {
      const learner = await svc.from("learner_profiles").upsert({ user_id: id, grade: opts?.grade ?? 9 });
      if (learner.error) throw new Error(`learner_profiles upsert failed: ${learner.error.message}`);
    }
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

/** Reads a user's profile role via the service client (bypasses RLS). */
export async function getProfileRole(userId: string): Promise<string | null> {
  const svc = serviceClient();
  const { data } = await svc.from("profiles").select("role").eq("id", userId).maybeSingle();
  return (data as { role: string | null } | null)?.role ?? null;
}

/** True when the user has a learner_profiles row (service client). */
export async function hasLearnerProfile(userId: string): Promise<boolean> {
  const svc = serviceClient();
  const { data } = await svc.from("learner_profiles").select("id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

/** Best-effort teardown — deleting the auth user cascades to owned rows. */
export async function deleteTestUsers(...users: (TestUser | undefined)[]): Promise<void> {
  const svc = serviceClient();
  for (const user of users) {
    if (user) await svc.auth.admin.deleteUser(user.id).catch(() => undefined);
  }
}

/** Creates a throwaway topic (service-role). Unique slug to avoid collisions. */
export async function createFixtureTopic(): Promise<{ id: string }> {
  const svc = serviceClient();
  seq += 1;
  const { data, error } = await svc
    .from("topics")
    .insert({
      grade: 9,
      name: "IT Fixture Topic",
      slug: `it-topic-${Date.now()}-${seq}`,
      description: "integration fixture",
      display_order: 999,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`topic insert failed: ${error?.message}`);
  return { id: (data as { id: string }).id };
}

/** Creates a question under a topic (service-role); `isActive` drives RLS visibility. */
export async function createFixtureQuestion(topicId: string, isActive: boolean): Promise<{ id: string }> {
  const svc = serviceClient();
  const { data, error } = await svc
    .from("questions")
    .insert({
      topic_id: topicId,
      grade: 9,
      question_text: "Fixture: 1 + 1",
      answer_text: "2",
      hint: "add them",
      solution_steps: ["1 + 1 = 2"],
      difficulty: "easy",
      marks: 1,
      is_active: isActive,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`question insert failed: ${error?.message}`);
  return { id: (data as { id: string }).id };
}

/** Best-effort fixture teardown — deleting a topic cascades to its questions. */
export async function deleteFixtureTopic(id: string | undefined): Promise<void> {
  if (!id) return;
  const svc = serviceClient();
  await svc.from("topics").delete().eq("id", id);
}

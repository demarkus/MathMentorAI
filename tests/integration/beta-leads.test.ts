import { describe, test, expect, afterEach } from "vitest";
import { hasIntegrationEnv, anonClient, serviceClient } from "./helpers";

/**
 * Issue 7 regression tests: the public beta form is anti-abuse hardened. Gated
 * on INTEGRATION_SUPABASE_* (needs the harden_beta_leads migration applied to
 * the test project). Runs against a dedicated test project only.
 */
describe.skipIf(!hasIntegrationEnv)("beta lead hardening (Issue 7)", () => {
  let seq = 0;
  const emails: string[] = [];
  function email(): string {
    seq += 1;
    const e = `beta-it-${Date.now()}-${seq}@mathmentor.test`;
    emails.push(e);
    return e;
  }

  afterEach(async () => {
    const svc = serviceClient();
    for (const e of emails.splice(0)) await svc.from("beta_leads").delete().eq("email", e);
  });

  async function submit(anon: ReturnType<typeof anonClient>, over: Record<string, unknown> = {}) {
    return anon.rpc("submit_beta_lead", {
      p_full_name: "IT Lead",
      p_email: email(),
      p_role: "parent",
      p_selected_plan: "parent-beta",
      p_phone: null,
      p_message: null,
      p_ip: null,
      ...over,
    });
  }

  test("a valid submission returns 'ok' and persists exactly one row", async () => {
    const anon = anonClient();
    const e = email();
    const { data, error } = await submit(anon, { p_email: e });
    expect(error).toBeNull();
    expect(data).toBe("ok");

    const { count } = await serviceClient().from("beta_leads").select("id", { count: "exact", head: true }).eq("email", e);
    expect(count).toBe(1);
  });

  test("a repeat of the same email + plan is suppressed as 'duplicate'", async () => {
    const anon = anonClient();
    const e = email();
    expect((await submit(anon, { p_email: e })).data).toBe("ok");
    expect((await submit(anon, { p_email: e })).data).toBe("duplicate");

    const { count } = await serviceClient().from("beta_leads").select("id", { count: "exact", head: true }).eq("email", e);
    expect(count).toBe(1);
  });

  test("an oversized name is rejected with an error", async () => {
    const anon = anonClient();
    const { error } = await submit(anon, { p_full_name: "x".repeat(200) });
    expect(error).not.toBeNull();
  });

  test("more than 5 submissions from one email in the window are rate limited", async () => {
    const anon = anonClient();
    const e = email();
    // 5 distinct plans (same email) all accepted, then the 6th is throttled.
    for (const plan of ["p1", "p2", "p3", "p4", "p5"]) {
      expect((await submit(anon, { p_email: e, p_selected_plan: plan })).data).toBe("ok");
    }
    expect((await submit(anon, { p_email: e, p_selected_plan: "p6" })).data).toBe("rate_limited");
  });

  test("a direct INSERT into beta_leads by anon is denied (all writes go via the function)", async () => {
    const anon = anonClient();
    const { error } = await anon
      .from("beta_leads")
      .insert({ full_name: "X", email: email(), role: "parent", selected_plan: "parent-beta" });
    expect(error).not.toBeNull();
  });
});

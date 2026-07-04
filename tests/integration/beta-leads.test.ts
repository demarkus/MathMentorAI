import { describe, test, expect, afterEach } from "vitest";
import { hasIntegrationEnv, anonClient, serviceClient } from "./helpers";

/**
 * Beta-lead DB-boundary hardening (Objective 4). Gated on INTEGRATION_SUPABASE_*
 * (needs the 20260704140000_beta_lead_db_boundary migration applied to the test
 * project). Runs against a dedicated test project only.
 *
 * submit_beta_lead() is now SERVICE-ROLE-ONLY, so these drive it via the service
 * client (as the validated Server Action does). Anonymous callers can no longer
 * invoke it — asserted below.
 */
describe.skipIf(!hasIntegrationEnv)("beta lead DB boundary (Objective 4)", () => {
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

  function submit(over: Record<string, unknown> = {}) {
    return serviceClient().rpc("submit_beta_lead", {
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

  async function rowCount(e: string): Promise<number> {
    const { count } = await serviceClient().from("beta_leads").select("id", { count: "exact", head: true }).eq("email", e);
    return count ?? 0;
  }

  test("a valid submission returns 'ok' and persists exactly one row", async () => {
    const e = email();
    const { data, error } = await submit({ p_email: e });
    expect(error).toBeNull();
    expect(data).toBe("ok");
    expect(await rowCount(e)).toBe(1);
  });

  test("a repeat of the same email + plan is suppressed as 'duplicate'", async () => {
    const e = email();
    expect((await submit({ p_email: e })).data).toBe("ok");
    expect((await submit({ p_email: e })).data).toBe("duplicate");
    expect(await rowCount(e)).toBe(1);
  });

  test("an invalid (non-canonical) plan id is rejected as 'invalid_plan' and stores nothing", async () => {
    const e = email();
    expect((await submit({ p_email: e, p_selected_plan: "hacker-plan" })).data).toBe("invalid_plan");
    expect((await submit({ p_email: e, p_selected_plan: "" })).data).toBe("invalid_plan");
    expect(await rowCount(e)).toBe(0);
  });

  test("an oversized name is rejected with an error", async () => {
    const { error } = await submit({ p_full_name: "x".repeat(200) });
    expect(error).not.toBeNull();
  });

  test("more than 5 submissions from one email in the window are rate limited", async () => {
    const e = email();
    // The 5 canonical plans (same email) are all accepted, then the 6th call is
    // throttled (rate limit is checked before dedup).
    for (const plan of ["parent-beta", "learner-monthly", "teacher-basic", "teacher-pro", "tutor-centre"]) {
      expect((await submit({ p_email: e, p_selected_plan: plan })).data).toBe("ok");
    }
    expect((await submit({ p_email: e, p_selected_plan: "parent-beta" })).data).toBe("rate_limited");
  });

  test("concurrent identical submissions resolve cleanly to exactly one row (no 500s)", async () => {
    const e = email();
    const results = await Promise.all(
      Array.from({ length: 6 }, () => submit({ p_email: e, p_selected_plan: "parent-beta" })),
    );
    // No call errors out — races become 'duplicate', never a crash.
    expect(results.every((r) => r.error === null)).toBe(true);
    const statuses = results.map((r) => r.data);
    expect(statuses.filter((s) => s === "ok").length).toBe(1); // exactly one winner
    expect(statuses.every((s) => s === "ok" || s === "duplicate")).toBe(true);
    expect(await rowCount(e)).toBe(1); // unique index held under concurrency
  });

  test("concurrent burst from one email never exceeds the rate limit (no 500s)", async () => {
    const e = email();
    const plans = ["parent-beta", "learner-monthly", "teacher-basic", "teacher-pro", "tutor-centre"];
    const results = await Promise.all(
      Array.from({ length: 9 }, (_, i) => submit({ p_email: e, p_selected_plan: plans[i % plans.length] })),
    );
    expect(results.every((r) => r.error === null)).toBe(true);
    const ok = results.filter((r) => r.data === "ok").length;
    expect(ok).toBeLessThanOrEqual(5); // advisory lock makes the count atomic
    expect(await rowCount(e)).toBe(ok); // rows persisted == accepted
    expect(await rowCount(e)).toBeLessThanOrEqual(5);
  });

  test("an anonymous caller cannot invoke submit_beta_lead (service-role-only)", async () => {
    const anon = anonClient();
    const { error } = await anon.rpc("submit_beta_lead", {
      p_full_name: "X",
      p_email: email(),
      p_role: "parent",
      p_selected_plan: "parent-beta",
      p_phone: null,
      p_message: null,
      p_ip: "1.2.3.4",
    });
    expect(error).not.toBeNull(); // permission denied for function
  });

  test("a direct INSERT into beta_leads by anon is denied", async () => {
    const anon = anonClient();
    const { error } = await anon
      .from("beta_leads")
      .insert({ full_name: "X", email: email(), role: "parent", selected_plan: "parent-beta" });
    expect(error).not.toBeNull();
  });
});

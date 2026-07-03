"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { BETA_ROLES, PLANS } from "@/lib/marketing/plans";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import type { BetaLeadInput, BetaLeadResult } from "@/app/beta/actions";

export function BetaLeadForm({
  initialPlan,
  onSubmit,
}: {
  initialPlan?: string;
  onSubmit: (input: BetaLeadInput) => Promise<BetaLeadResult>;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>(BETA_ROLES[0].value);
  const [selectedPlan, setSelectedPlan] = useState<string>(initialPlan || PLANS[0].id);
  const [message, setMessage] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) return;
    setError(null);
    startTransition(async () => {
      const result = await onSubmit({
        full_name: fullName,
        email,
        phone,
        role,
        selected_plan: selectedPlan,
        message,
      });
      if (result?.ok) setDone(true);
      else setError(result?.error ?? "Something went wrong. Please try again.");
    });
  }

  if (done) {
    return (
      <EmptyState
        icon="✓"
        title="You’re on the list!"
        description="Thanks — we’ve saved your request and will be in touch about next steps. Live payment checkout is coming soon; no payment is needed yet."
        action={
          <Link href="/pricing" className="inline-flex rounded-xl border border-line px-5 py-3 font-semibold hover:border-brand/40">
            Back to pricing
          </Link>
        }
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-line bg-white p-6 md:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Full name">
          <Input
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            aria-required="true"
            autoComplete="name"
          />
        </Field>

        <Field label="Email">
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            aria-required="true"
            autoComplete="email"
          />
        </Field>

        <Field label="Phone" hint="(optional)">
          <Input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>

        <Field label="I am a…">
          <Select value={role} onChange={(event) => setRole(event.target.value)}>
            {BETA_ROLES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Plan of interest" className="sm:col-span-2">
          <Select value={selectedPlan} onChange={(event) => setSelectedPlan(event.target.value)}>
            {PLANS.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} — {plan.price} {plan.cadence}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Message" hint="(optional)" className="mt-5">
        <Textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          placeholder="Tell us about your learner, class, or centre."
        />
      </Field>

      {error && (
        <Alert variant="error" className="mt-5">
          {error}
        </Alert>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="mt-6 rounded-xl bg-brand px-6 py-3 font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Request beta access"}
      </button>
      <p className="mt-4 text-xs text-muted">No payment is required now. Live payment checkout is coming soon.</p>
    </form>
  );
}

import { SiteHeader } from "@/components/site-header";
import { BetaLeadForm } from "@/components/marketing/BetaLeadForm";
import { submitBetaLead } from "./actions";
import { isPlanId, planName } from "@/lib/marketing/plans";

export const metadata = {
  title: "Request beta access · Math Mentor AI",
  description: "Join the Math Mentor AI beta. No payment required yet.",
};

export default async function BetaPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;
  const initialPlan = isPlanId(plan) ? plan : undefined;

  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-5 py-16 md:py-20">
        <p className="text-sm font-semibold uppercase tracking-[.18em] text-brand">Beta access</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Request your beta spot.</h1>
        <p className="mt-4 text-lg leading-8 text-muted">
          {initialPlan ? (
            <>
              You’re requesting the <span className="font-semibold text-foreground">{planName(initialPlan!)}</span> plan.
              Tell us where to reach you and we’ll set you up.
            </>
          ) : (
            <>Tell us a little about you and we’ll help you get started. Live payment checkout is coming soon.</>
          )}
        </p>

        <div className="mt-10">
          <BetaLeadForm initialPlan={initialPlan} onSubmit={submitBetaLead} />
        </div>
      </section>
    </main>
  );
}

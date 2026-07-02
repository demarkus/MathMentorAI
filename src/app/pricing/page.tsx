import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { PricingCard } from "@/components/marketing/PricingCard";
import { PLANS } from "@/lib/marketing/plans";

export const metadata = {
  title: "Pricing · Math Mentor AI",
  description: "Beta pricing for learners, parents, teachers, and tutor centres.",
};

export default function PricingPage() {
  return (
    <main>
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[.18em] text-brand">Pricing</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight md:text-5xl">Simple beta pricing.</h1>
          <p className="mt-4 text-lg leading-8 text-muted">
            Join the Math Mentor AI beta. Live payment checkout is coming soon — for now, choose a plan and we’ll
            reserve your spot.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>

        <p className="mt-10 text-sm text-muted">
          Not sure which plan fits?{" "}
          <Link href="/beta" className="font-semibold text-brand hover:underline">
            Request beta access
          </Link>{" "}
          and we’ll help you choose.
        </p>
      </section>
    </main>
  );
}

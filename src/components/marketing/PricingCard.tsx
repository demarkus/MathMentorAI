import Link from "next/link";
import type { Plan } from "@/lib/marketing/plans";

export function PricingCard({ plan }: { plan: Plan }) {
  return (
    <article
      className={`flex flex-col rounded-2xl border bg-white p-6 ${
        plan.featured ? "border-brand shadow-lg shadow-brand/10" : "border-line"
      }`}
    >
      {plan.featured && (
        <span className="mb-3 inline-flex w-fit rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-semibold">{plan.name}</h3>
      <p className="mt-3">
        <span className="text-3xl font-semibold tracking-tight">{plan.price}</span>{" "}
        <span className="text-sm text-muted">{plan.cadence}</span>
      </p>
      <p className="mt-3 text-sm leading-6 text-muted">{plan.description}</p>

      <ul className="mt-5 space-y-2 text-sm">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <span aria-hidden className="mt-0.5 text-brand">✓</span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={`/beta?plan=${plan.id}`}
        className={`mt-6 inline-flex justify-center rounded-xl px-5 py-3 font-semibold ${
          plan.featured
            ? "bg-brand text-white hover:bg-brand-dark"
            : "border border-line hover:border-brand/40"
        }`}
      >
        Choose {plan.name}
      </Link>
    </article>
  );
}

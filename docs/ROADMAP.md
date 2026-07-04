# Roadmap — Math Mentor AI

Sequenced from the current MVP toward a monetised beta. Items reflect the [current limitations](MVP_SCOPE.md#-intentionally-excluded-for-now); nothing here is built yet unless the MVP scope says so.

## Next 30 days — make the beta collectable

- **Payment integration (PayFast or Yoco first, SA-friendly).** Wire real checkout to the existing `/pricing` plans; convert `beta_leads` interest into paid subscriptions.
- **Beta onboarding flow.** _Started:_ completing onboarding as a learner now routes straight into the diagnostic, whose result page points to the recommended first practice set. _Remaining:_ a richer welcome/first-run walkthrough if desired.
- **Production email templates.** _Started:_ branded confirm-signup + reset-password HTML in `supabase/templates/` ([EMAIL_TEMPLATES.md](EMAIL_TEMPLATES.md)). _Remaining:_ paste them into the Supabase dashboard and configure a custom SMTP sender for deliverability.
- **Apply all migrations to the production database** and run the deployment smoke test.

## Next 60 days — parents and trust

- **Secure parent–learner linking.** Learner-email invite + learner confirmation; unlock the parent report pages (currently placeholders) to read *only* linked learners' data under RLS.
- **Real parent progress reports.** Populate `TopicRiskTable` / `RecommendationList` from the linked learner's `reports` and `attempts`.
- **Grow test coverage.** A unit suite (Vitest) for the deterministic logic, a gated integration/RLS suite, and a Playwright E2E suite already run in CI. Extend coverage as parent linking, payments, and symbolic checking land.
- **Basic analytics.** Funnel + core-loop events (signup → diagnostic → practice → subscribe).

## Next 90 days — depth and polish

- **Improved symbolic answer checking.** Move beyond string normalisation toward equivalence for algebraic forms (e.g. factor order, sign, simple simplification).
- **AI-guided hints/explanations.** Optional model-generated hints layered on top of the seeded `solution_steps`.
- **PDF export.** Server-side PDF for teacher worksheets/memos and learner/parent reports.
- **Content expansion.** Grow the question bank and consider adjacent topics/grades once the core loop is proven.

## Five-month income plan *(illustrative — planning target, not a forecast)*

Assumes payments live by month 1 and parent linking by month 2. Prices from `src/lib/marketing/plans.ts`.

| Month | Focus | Illustrative goal |
|-------|-------|-------------------|
| 1 | Paid beta launch (Parent Beta R199/4wk, Learner Monthly R149) | Convert first paying cohort from `beta_leads` |
| 2 | Parent linking live; Teacher Basic/Pro (R79 / R149) push to teachers | Add teacher subscriptions alongside learners |
| 3 | Retention + content depth; reduce churn | Grow recurring MRR; first renewals |
| 4 | Tutor Centre (from R499) outreach to centres/small schools | Land first higher-value centre accounts |
| 5 | Optimise funnel with analytics; annual/term options | Compounding MRR across all four segments |

> These figures are **directional planning inputs**, not committed revenue. Actuals depend on conversion, pricing tests, and marketing — none of which are instrumented yet. Track against real data once analytics and payments ship.

## Dependencies & risks

- Payments and parent linking are the two gates to monetisation; both are currently **not implemented**.
- Symbolic/AI features should not regress the current deterministic grading — keep them additive and testable.
- Automated tests exist (unit + gated integration/RLS + E2E in CI); keep them green and extend coverage before large logic changes.
- **CAPS alignment is self-declared, not independently reviewed.** Topics carry a `curriculum_tag` of `CAPS`, but no external curriculum review has been done yet — see [CURRICULUM_VALIDATION.md](CURRICULUM_VALIDATION.md) for the evidence still required before making a stronger claim.

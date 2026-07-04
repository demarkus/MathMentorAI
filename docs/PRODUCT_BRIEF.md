# Product Brief — Math Mentor AI

## Vision

Make Grade 9 and Grade 10 algebra feel manageable for South African learners by turning a vague sense of "I'm bad at maths" into a concrete, improvable list of topics — with focused practice, hints before answers, and progress that learners and the adults around them can actually see.

Math Mentor AI is a **CAPS-aligned Grade 9 & 10 Algebra Booster**. The MVP deliberately does one subject band well rather than trying to cover the whole curriculum.

> "CAPS-aligned" here means the content is **structured around and tagged** CAPS Grade 9–10 algebra — a self-declared alignment, **not** an independently curriculum-reviewed one. The evidence still required for a stronger claim is tracked in [CURRICULUM_VALIDATION.md](CURRICULUM_VALIDATION.md). Do not describe the content as verified/approved CAPS until that review exists.

## Core value proposition

- **Diagnose, don't guess.** A short diagnostic identifies which algebra topics need attention first.
- **Learn through mistakes.** Practice reveals a hint first and the worked solution second, building problem-solving habits instead of answer-copying.
- **Progress you can see.** Topic-level scores make improvement visible to learners — and, once linking ships, to parents.
- **Tools for the adults too.** Teachers generate worksheets/tests/memos in seconds; admins curate the question bank.

## Target customers

| Segment | Who | What they want |
|---------|-----|----------------|
| **Learners** | Grade 9–10 students preparing for tests/exams | Confidence, focused practice, clear feedback |
| **Parents** | Parents of Grade 9–10 learners | Visibility into how their child is doing (planned via secure linking) |
| **Teachers / tutors** | Maths teachers and private tutors | Fast, printable worksheets, tests, and memos |
| **Tutor centres / small schools** | Multi-learner operations | Bulk resource generation and (future) multi-learner management |

## Monetisation model

Subscription-based, aimed at the four segments above. The current pricing (see the in-app `/pricing` page and `src/lib/marketing/plans.ts`):

| Plan | Price | Audience |
|------|-------|----------|
| Parent Beta | R199 for 4 weeks | Parents trialling for one learner |
| Learner Monthly | R149 / month | Independent learners |
| Teacher Basic | R79 / month | Single-class teachers |
| Teacher Pro | R149 / month | Both grades, full teacher toolkit |
| Tutor Centre | from R499 / month | Centres and small schools |

> Payment collection is **not yet integrated** — the pricing and beta pages currently capture leads only (`beta_leads`). Live checkout (PayFast/Yoco/Stripe) is on the roadmap.

## Positioning

A narrow, high-quality wedge (Grade 9–10 algebra, CAPS) that can expand grade-by-grade and topic-by-topic once the core learning loop and monetisation are proven with a paying beta cohort.

## Related docs

- [MVP Scope](MVP_SCOPE.md) — what's in and out today
- [Roadmap](ROADMAP.md) — the path to a monetised beta

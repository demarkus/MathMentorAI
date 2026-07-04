# Curriculum validation — CAPS alignment status

This document records what "CAPS-aligned" currently means for Math Mentor AI, and
what evidence is still required before we can claim independently-reviewed CAPS
alignment. It exists so product, marketing, and documentation do not overstate the
curriculum claim.

## Two different claims — do not conflate them

1. **Topics are *tagged* CAPS in the database.**
   Every topic row carries `curriculum_tag = 'CAPS'` (see `topics` in
   [DATABASE.md](DATABASE.md)) and the seed content is *structured around* CAPS
   Grade 9 & 10 algebra strands (factorisation, linear equations, algebraic
   fractions, simultaneous equations, exponents, functions, number patterns).
   **This is a self-applied label chosen by the authors, not third-party
   verification.**

2. **Independently curriculum-reviewed CAPS alignment.**
   A qualified reviewer has checked each grade/topic/question against the official
   Department of Basic Education (DBE) CAPS document and signed off on the mapping.
   **This has NOT been done.** No external review, citation, or approval exists yet.

Until claim (2) is satisfied, avoid language that implies it (e.g. "verified
CAPS-compliant", "approved by …", "meets the CAPS curriculum"). The accurate
phrasing is "CAPS-aligned (self-declared / tagged), pending independent review".

## Evidence required to claim independent alignment

| # | Evidence | Status | Owner | Notes |
|---|----------|--------|-------|-------|
| 1 | Official DBE CAPS source document (title, phase, exact version/year) cited | ☐ Not started | — | Grade 7–9 Senior Phase and Grade 10–12 FET Mathematics CAPS are separate documents |
| 2 | Grade → topic → CAPS objective/assessment-standard mapping (per topic and question) | ☐ Not started | — | Each seed topic and question mapped to a specific CAPS content/skill statement |
| 3 | Named reviewer with relevant qualification (e.g. SACE-registered maths educator) | ☐ Not started | — | Record name and credential |
| 4 | Review date | ☐ Not started | — | ISO date of sign-off |
| 5 | Curriculum version reviewed against | ☐ Not started | — | The CAPS revision the mapping targets |
| 6 | Approval status + reviewer statement | ☐ Not started | — | Approved / changes-requested / rejected, with notes |

## How to update this document

When a review is performed, fill in the table above with the real evidence, change
the status boxes to ☑, and only then update the product/marketing copy (README,
PRODUCT_BRIEF, MVP_SCOPE) to reflect independently-reviewed alignment. Do **not**
invent a source, reviewer, date, or approval to fill these in — an empty, honest
row is correct until the review actually happens.

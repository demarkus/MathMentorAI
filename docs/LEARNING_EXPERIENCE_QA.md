# Learning Experience QA — Math Mentor AI

A manual smoke-test checklist for the learner mathematics experience. Run these
after changes to the quiz components, math libs, or learner pages. Sign in as a
learner with a completed onboarding (grade set) before starting.

Related code: `src/components/quiz/`, `src/lib/math/`, `src/app/learner/`.

## Diagnostic — question display
- [ ] `/learner/diagnostic` loads a set of questions across Grade 9 and Grade 10.
- [ ] Each question shows topic, grade, difficulty, and marks as clear badges.
- [ ] The question text is prominent, readable, and long expressions wrap (don't clip).
- [ ] Caret exponents render as real superscripts (`x^2` displays as x²) in question
      text, hints, worked steps, and revealed answers. An unrecognised caret
      (`x^ 2`, `x^(a+b)`) is left as-is.
- [ ] Simple fractions render stacked (numerator over a line over denominator):
      `1/2`, `2/x`, `6x/3` — including inside worked steps ("Answer: 5/x.").
      Ambiguous slashes stay plain text: `x=2/x=3` (root list), `0.5/2` (decimal),
      `(x - 9)/(x - 3)` (compound). A screen reader announces "1 over 2".
- [ ] Square roots render with an overlined radicand: `√16`, `√(x+2)`; `√ 16`
      (spaced) is left as typed. Other notation appears exactly as stored.
- [ ] "Question X of Y" and the progress bar update as you move with Previous / Next.
- [ ] A short note about the expected answer form appears (e.g. "Give the value of the unknown").

## Question navigation strip (diagnostic & practice)
- [ ] A row of numbered circles appears between the progress bar and the question.
- [ ] Clicking a number jumps straight to that question (in both directions).
- [ ] Answered questions show as filled (brand colour); unanswered stay outlined.
- [ ] The current question carries a visible ring, on top of either fill state.
- [ ] The buttons are keyboard-focusable and announce "Question N, answered/unanswered"
      to screen readers; the current one is marked `aria-current`.
- [ ] Submitting with unanswered questions prompts "You have N unanswered question(s).
      Submit anyway?" — Cancel returns to the quiz with nothing submitted; OK submits.
- [ ] Submitting with every question answered shows no prompt.

## Practice — question display
- [ ] `/learner/practice` lists topics grouped by grade.
- [ ] Choosing a topic (or a specific grade when offered in both) opens a practice set.
- [ ] Consecutive runs of the same topic rotate through unseen questions first —
      recently-attempted ones reappear only when the topic bank is too small to
      fill a set without them.
- [ ] Question presentation matches the diagnostic (badges, wrapping, notation).
- [ ] The expected-answer note reflects the answer form (numeric / expression / equation).

## Answer input
- [ ] The input shows an example placeholder (`e.g. x = 5, (x+2)(x+3), 2x+1`).
- [ ] Helper text reads "Type your final answer. Use brackets where needed. Press Enter to continue."
- [ ] Pressing **Enter** checks the answer (practice) or advances / submits appropriately.
- [ ] The browser does not auto-capitalise or autocorrect the field.

## Correct answer feedback (practice)
- [ ] After "Check answer" on a correct answer, a warm positive message appears.
- [ ] The accepted answer is shown.
- [ ] Worked steps render as an ordered list.
- [ ] `x = 5` is accepted when the stored answer is `5` (and vice versa).
- [ ] Reordered factors are accepted (`(x+3)(x+2)` for a stored `(x+2)(x+3)`),
      including with a shared leading coefficient (`2(x-2)(x+2)` for `2(x+2)(x-2)`).
- [ ] A different leading coefficient is NOT accepted (`2(x+2)(x+3)` for a stored `(x+2)(x+3)`).
- [ ] An exact decimal is accepted for a stored fraction (`0.5` for `1/2`) — but never an approximation (`0.33` for `1/3` stays incorrect).
- [ ] Multi-root answers are accepted in any order (`x=3 or x=2` for a stored `x=2orx=3`); a single root of two is not.
- [ ] `/` between assignments is accepted as a root separator (`x=2/x=3` for `x=2orx=3`),
      while `/` inside a value stays a fraction (`1/2` is not the roots 1 and 2).
- [ ] Unicode superscripts are accepted (`x²+3x` for a stored `x^2+3x`).
- [ ] Same-form rewrites are accepted: term order (`(2+x)(x+3)` for `(x+2)(x+3)`,
      `1+2x+x^2` for `x^2+2x+1`) and spacing (`2 x+1` for `2x+1`).
- [ ] Cross-form answers stay incorrect: `x^2-9` is NOT accepted for a stored
      `(x-3)(x+3)` (echoing a factorise question back), and `6x/3` is NOT accepted
      for `2x` (unsimplified). `2+2` is NOT accepted for `4`.

## Incorrect answer feedback (practice)
- [ ] A supportive (non-shaming) message appears — never "failed" or "wrong/bad".
- [ ] The learner's own answer is shown.
- [ ] The correct answer is shown.
- [ ] The hint appears **first**, in its own hint box (when a hint exists).
- [ ] With `ANTHROPIC_API_KEY` set, the hint targets the specific mistake (and never
      states the correct answer) and the worked steps start from the learner's
      error and end at the correct answer; without it, the seeded hint and
      `solution_steps` appear. The correct/incorrect verdict is identical in
      both configurations.
- [ ] Worked steps appear below the hint.
- [ ] Encouragement to review/retry is present.

## Hints & worked steps
- [ ] Hints render in a distinct box, separate from the steps.
- [ ] `solution_steps` array renders as an ordered list.
- [ ] A question with no steps shows "Worked solution not available yet." (no crash).
- [ ] No raw HTML is injected (content is plain text only).

## Empty answer
- [ ] Leaving the field blank and checking/submitting is allowed.
- [ ] A blank answer is marked incorrect (not accepted as correct).

## Result pages
- [ ] Diagnostic result shows score, total marks, and percentage.
- [ ] Practice result shows score, total marks, percentage, and count to review.
- [ ] A performance band appears: Strong (80%+), Developing well (60–79%),
      Needs focused practice (40–59%), Needs support and revision (<40%).
- [ ] Strong and weak topics are listed clearly (diagnostic).
- [ ] The diagnostic result includes a "Question-by-question review": each question
      shows a Correct/Review pill, the learner's answer and the correct answer side
      by side ("—" for blanks), the hint (incorrect answers only), and worked steps.
- [ ] Reports saved before the review existed still render (summary only, no review
      section, no crash).
- [ ] Each practice mistake shows the question, the learner's answer, the accepted
      answer, and worked steps.
- [ ] A "Your next step" recommendation is present and matches the score.
- [ ] The practice result offers a "Practise [Topic Name] next" CTA (display name,
      never the slug) linking to that topic's practice set for the learner's grade.
- [ ] The next-topic CTA is omitted when the recommendation would be the topic just
      practised (Retry stays the primary action) or when no recommendation exists.
- [ ] Next-step CTAs work: practise weakest topic, browse topics, retake/retry, view progress.

## Progress page
- [ ] With no data, `/learner/progress` shows the empty state with diagnostic + practice CTAs.
- [ ] With data, quizzes completed, questions attempted, and average score cards render.
- [ ] Strengths show a "Good progress" label; focus areas show a "Focus here next" label.
- [ ] The recommended-next topic links to a real practice set.
- [ ] When the learner passes routine (easy/medium) questions but fails hard ones in
      the recommended topic (≥2 attempts on each side), the card says so specifically
      ("solid on routine questions… harder problem-solving questions need work") with
      both percentages; otherwise the generic "lift your weakest area" line shows.
- [ ] Once questions carry CAPS cognitive levels (admin form), a routine-mastered /
      applied-failing split takes precedence: "mastered the routine mechanics…
      practise the word problems in this topic." Parents see the same split as an
      extra recommendation on the linked learner's report.
- [ ] Topic performance table and recent activity render without misleading precision.

## Topic page — per-topic progress
- [ ] `/learner/topics/<slug>` shows a "Your progress" card with accuracy for that topic.
- [ ] The mastery badge matches the percentage: Strong (75%+), Developing (50–74%),
      Needs practice (<50%).
- [ ] With no attempts on the topic, the card reads "You haven't practised this topic
      yet" (no crash, no fake 0%).

## Mobile layout
- [ ] Diagnostic and practice question cards are usable at ~375px width.
- [ ] Badges wrap instead of overflowing.
- [ ] The answer input is full width and easy to tap.
- [ ] Result pages and the topic performance table scroll/wrap cleanly on mobile.

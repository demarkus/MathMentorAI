# Learning Experience QA — Math Mentor AI

A manual smoke-test checklist for the learner mathematics experience. Run these
after changes to the quiz components, math libs, or learner pages. Sign in as a
learner with a completed onboarding (grade set) before starting.

Related code: `src/components/quiz/`, `src/lib/math/`, `src/app/learner/`.

## Diagnostic — question display
- [ ] `/learner/diagnostic` loads a set of questions across Grade 9 and Grade 10.
- [ ] Each question shows topic, grade, difficulty, and marks as clear badges.
- [ ] The question text is prominent, readable, and long expressions wrap (don't clip).
- [ ] Mathematical notation (e.g. `x^2`, `/`, brackets) appears exactly as stored.
- [ ] "Question X of Y" and the progress bar update as you move with Previous / Next.
- [ ] A short note about the expected answer form appears (e.g. "Give the value of the unknown").

## Practice — question display
- [ ] `/learner/practice` lists topics grouped by grade.
- [ ] Choosing a topic (or a specific grade when offered in both) opens a practice set.
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

## Incorrect answer feedback (practice)
- [ ] A supportive (non-shaming) message appears — never "failed" or "wrong/bad".
- [ ] The learner's own answer is shown.
- [ ] The correct answer is shown.
- [ ] The hint appears **first**, in its own hint box (when a hint exists).
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
- [ ] Each practice mistake shows the question, the learner's answer, the accepted
      answer, and worked steps.
- [ ] A "Your next step" recommendation is present and matches the score.
- [ ] Next-step CTAs work: practise weakest topic, browse topics, retake/retry, view progress.

## Progress page
- [ ] With no data, `/learner/progress` shows the empty state with diagnostic + practice CTAs.
- [ ] With data, quizzes completed, questions attempted, and average score cards render.
- [ ] Strengths show a "Good progress" label; focus areas show a "Focus here next" label.
- [ ] The recommended-next topic links to a real practice set.
- [ ] Topic performance table and recent activity render without misleading precision.

## Mobile layout
- [ ] Diagnostic and practice question cards are usable at ~375px width.
- [ ] Badges wrap instead of overflowing.
- [ ] The answer input is full width and easy to tap.
- [ ] Result pages and the topic performance table scroll/wrap cleanly on mobile.

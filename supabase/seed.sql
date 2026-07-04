-- Math Mentor AI seed data
--
-- Run AFTER applying the migrations in supabase/migrations/ (not schema.sql,
-- which is a reference copy only). This file loads the full CAPS content:
-- 14 topics (7 per grade) and 108 questions.
--
-- Single command, no manual pre-step, safe to re-run, never deletes learner
-- data OR custom admin content. The initial migration (20260630012144) seeds a
-- smaller baseline (9 topics / 30 questions) using unicode superscript notation
-- (x², a⁸, ×, ÷) plus an 'exam-revision' topic. This canonical catalogue uses
-- caret notation (x^2, a^8) and drops exam-revision, so the superseded baseline
-- rows would otherwise linger as near-duplicates.
--
-- Reconciliation is by explicit ALLOW-LIST, not "delete everything unattempted".
-- We remove ONLY rows that exactly match the known baseline fingerprint
-- (grade + slug + question_text + answer_text + hint) AND have no attempts.
-- This guarantees:
--   * a custom admin question never matches the fingerprint            → preserved;
--   * a baseline row edited in any fingerprint field no longer matches → preserved;
--   * an attempted baseline row is preserved (history is never lost);
--   * a custom topic (empty or not) is never dropped — only the known baseline
--     'exam-revision' topic is removed, and only once it is empty;
--   * identical-text baseline rows already equal to canonical content are left
--     in place (no delete/re-insert churn), so the seed stays cleanly rerunnable.
--
-- Do not seed profiles here because profiles depend on auth.users.
--
-- Safe to re-run:
--   * topics upsert on their (grade, slug) unique key.
--   * questions are looked up by grade + slug (never hardcoded UUIDs) and only
--     inserted when an identical question_text is not already present for that
--     topic, so re-running does not create duplicate rows of the same text.
--
-- Questions use the current schema columns only: topic_id, grade, question_text,
-- answer_text, hint, solution_steps (jsonb array), difficulty, marks, is_active.
-- There is no explanation_text column; worked steps live in solution_steps.

-- Reconcile the migration baseline without touching learner or custom data ----
-- The allow-list holds only the SUPERSEDED baseline rows (those whose text is not
-- part of this canonical catalogue); identical-text baseline rows already equal
-- the canonical content and are intentionally omitted so re-runs cause no churn.
with superseded_baseline(grade, slug, question_text, answer_text, hint) as (
  values
    (9,  'factorisation',          'Factorise: x² + 5x + 6',      '(x+2)(x+3)',   'Find factors of 6 that add to 5.'),
    (9,  'factorisation',          'Factorise: x² - 9',           '(x-3)(x+3)',   'Use difference of squares.'),
    (9,  'exponents',              'Simplify: x³ × x⁴',           'x^7',          'Add exponents with the same base.'),
    (9,  'exponents',              'Simplify: a⁸ ÷ a³',           'a^5',          'Subtract exponents.'),
    (9,  'exponents',              'Simplify: (m²)³',             'm^6',          'Multiply the exponents.'),
    (9,  'exponents',              'Evaluate: 2⁻³',               '1/8',          'A negative exponent means reciprocal.'),
    (10, 'factorisation',          'Factorise: x² + 7x + 12',     '(x+3)(x+4)',   'Find factors of 12 that add to 7.'),
    (10, 'factorisation',          'Factorise: 4x² - 25',         '(2x-5)(2x+5)', 'Use difference of squares.'),
    (10, 'factorisation',          'Factorise: 2x² + 7x + 3',     '(2x+1)(x+3)',  'Split the middle term using 6 and 1.'),
    (10, 'factorisation',          'Factorise: x³ - 4x',          'x(x-2)(x+2)',  'Take out x first.'),
    (10, 'algebraic-fractions',    'Simplify: 6x/3',              '2x',           'Divide the coefficient by 3.'),
    (10, 'algebraic-fractions',    'Simplify: (x² - 9)/(x - 3)',  'x+3',          'Factor the numerator first.'),
    (10, 'simultaneous-equations', 'Solve for x: x + y = 10 and y = 4', '6',      'Substitute y = 4.'),
    (10, 'functions',              'If g(x) = x² - 4, find g(5)', '21',           'Substitute x = 5.'),
    (10, 'exam-revision',          'Solve: x² - 5x + 6 = 0',      'x=2orx=3',     'Factorise, then use the zero-product rule.')
)
delete from public.questions q
using public.topics t, superseded_baseline b
where q.topic_id = t.id
  and t.grade = b.grade
  and t.slug = b.slug
  and q.grade = b.grade
  and q.question_text = b.question_text
  and q.answer_text = b.answer_text
  and q.hint = b.hint
  and not exists (select 1 from public.attempts a where a.question_id = q.id);

-- Remove ONLY the known baseline 'exam-revision' topic, and only once it is empty
-- (its single baseline question removed above and unattempted). Any other empty
-- topic — including custom admin topics — is deliberately left untouched.
delete from public.topics t
where t.grade = 10
  and t.slug = 'exam-revision'
  and t.name = 'Exam-style revision'
  and not exists (select 1 from public.questions q where q.topic_id = t.id);

-- Topics ------------------------------------------------------------------------

insert into public.topics (grade, name, slug, description, curriculum_tag, display_order) values
  (9,  'Factorisation',          'factorisation',          'Common factors, trinomials, and difference of squares.', 'CAPS', 1),
  (9,  'Linear equations',       'linear-equations',       'Solve equations one step at a time.',                    'CAPS', 2),
  (9,  'Algebraic fractions',    'algebraic-fractions',    'Simplify and combine simple fractions.',                 'CAPS', 3),
  (9,  'Simultaneous equations', 'simultaneous-equations', 'Solve pairs of equations by substitution.',              'CAPS', 4),
  (9,  'Exponents',              'exponents',              'Apply the laws of indices.',                             'CAPS', 5),
  (9,  'Functions basics',       'functions',              'Work with notation, inputs, and outputs.',               'CAPS', 6),
  (9,  'Number patterns',        'number-patterns',        'Find rules and predict terms.',                          'CAPS', 7),
  (10, 'Factorisation',          'factorisation',          'Trinomials, grouping, and difference of squares.',       'CAPS', 1),
  (10, 'Linear equations',       'linear-equations',       'Solve multi-step linear equations.',                     'CAPS', 2),
  (10, 'Algebraic fractions',    'algebraic-fractions',    'Simplify and solve rational expressions.',               'CAPS', 3),
  (10, 'Simultaneous equations', 'simultaneous-equations', 'Solve pairs of equations algebraically.',                'CAPS', 4),
  (10, 'Exponents',              'exponents',              'Apply the laws of indices with integer powers.',         'CAPS', 5),
  (10, 'Functions basics',       'functions',              'Evaluate functions and solve for inputs.',               'CAPS', 6),
  (10, 'Number patterns',        'number-patterns',        'Linear patterns and general terms.',                     'CAPS', 7)
on conflict (grade, slug) do update
  set name = excluded.name,
      description = excluded.description,
      curriculum_tag = excluded.curriculum_tag,
      display_order = excluded.display_order;

-- Questions ---------------------------------------------------------------------

with seed(grade, slug, question_text, answer_text, hint, steps, difficulty, marks) as (
  values
  -- Grade 9 · Factorisation (10)
  (9,'factorisation','Factorise: 6x + 12','6(x+2)','Find the highest common factor.','["The HCF is 6.","6x + 12 = 6(x + 2)."]'::jsonb,'easy'::public.question_difficulty,1),
  (9,'factorisation','Factorise: 8a - 20','4(2a-5)','Both terms divide by 4.','["The HCF is 4.","8a - 20 = 4(2a - 5)."]','easy',1),
  (9,'factorisation','Factorise: 10x + 15','5(2x+3)','Both terms divide by 5.','["The HCF is 5.","10x + 15 = 5(2x + 3)."]','easy',1),
  (9,'factorisation','Factorise: 3x^2 + 6x','3x(x+2)','Take out the common factor 3x.','["The HCF is 3x.","3x^2 + 6x = 3x(x + 2)."]','easy',1),
  (9,'factorisation','Factorise: x^2 + 5x + 6','(x+2)(x+3)','Find factors of 6 that add to 5.','["2 and 3 multiply to 6 and add to 5.","Answer: (x + 2)(x + 3)."]','medium',2),
  (9,'factorisation','Factorise: x^2 + 7x + 10','(x+2)(x+5)','Find factors of 10 that add to 7.','["2 and 5 multiply to 10 and add to 7.","Answer: (x + 2)(x + 5)."]','medium',2),
  (9,'factorisation','Factorise: x^2 - 9','(x-3)(x+3)','Use the difference of squares.','["x^2 - 9 = x^2 - 3^2.","Answer: (x - 3)(x + 3)."]','medium',2),
  (9,'factorisation','Factorise: x^2 - 16','(x-4)(x+4)','Use the difference of squares.','["x^2 - 16 = x^2 - 4^2.","Answer: (x - 4)(x + 4)."]','medium',2),
  (9,'factorisation','Factorise: x^2 - 4x','x(x-4)','Take out the common factor x.','["The HCF is x.","x^2 - 4x = x(x - 4)."]','easy',1),
  (9,'factorisation','Factorise: x^2 + 8x + 15','(x+3)(x+5)','Find factors of 15 that add to 8.','["3 and 5 multiply to 15 and add to 8.","Answer: (x + 3)(x + 5)."]','medium',2),

  -- Grade 9 · Linear equations (10)
  (9,'linear-equations','Solve: x + 7 = 15','8','Undo adding 7.','["Subtract 7 from both sides.","x = 8."]','easy',1),
  (9,'linear-equations','Solve: x - 4 = 9','13','Undo subtracting 4.','["Add 4 to both sides.","x = 13."]','easy',1),
  (9,'linear-equations','Solve: 3x = 21','7','Divide both sides by 3.','["21 divided by 3 is 7.","x = 7."]','easy',1),
  (9,'linear-equations','Solve: 2x + 5 = 17','6','Remove 5 first.','["2x = 12.","x = 6."]','medium',2),
  (9,'linear-equations','Solve: 4x - 3 = 13','4','Add 3 first.','["4x = 16.","x = 4."]','medium',2),
  (9,'linear-equations','Solve: 5x - 8 = 2x + 13','7','Collect x terms on one side.','["3x - 8 = 13.","3x = 21.","x = 7."]','hard',3),
  (9,'linear-equations','Solve: x / 2 = 6','12','Multiply both sides by 2.','["x = 6 times 2.","x = 12."]','easy',1),
  (9,'linear-equations','Solve: 3x + 4 = 19','5','Remove 4 first.','["3x = 15.","x = 5."]','medium',2),
  (9,'linear-equations','Solve: 7x = 42','6','Divide both sides by 7.','["42 divided by 7 is 6.","x = 6."]','easy',1),
  (9,'linear-equations','Solve: 2(x + 3) = 14','4','Expand the bracket first.','["2x + 6 = 14.","2x = 8.","x = 4."]','medium',2),

  -- Grade 9 · Algebraic fractions (10)
  (9,'algebraic-fractions','Simplify: 6x / 3','2x','Divide the coefficient by 3.','["6 divided by 3 is 2.","Answer: 2x."]','easy',1),
  (9,'algebraic-fractions','Simplify: 10x / 5','2x','Divide the coefficient by 5.','["10 divided by 5 is 2.","Answer: 2x."]','easy',1),
  (9,'algebraic-fractions','Simplify: 8x / 2','4x','Divide the coefficient by 2.','["8 divided by 2 is 4.","Answer: 4x."]','easy',1),
  (9,'algebraic-fractions','Simplify: 2/x + 3/x','5/x','The denominators are equal.','["Add the numerators: 2 + 3.","Answer: 5/x."]','easy',1),
  (9,'algebraic-fractions','Simplify: 7/x - 4/x','3/x','The denominators are equal.','["Subtract the numerators: 7 - 4.","Answer: 3/x."]','easy',1),
  (9,'algebraic-fractions','Simplify: 12ab / 4','3ab','Divide the coefficient by 4.','["12 divided by 4 is 3.","Answer: 3ab."]','medium',2),
  (9,'algebraic-fractions','Simplify: x^2 / x','x','Subtract the exponents.','["x^2 divided by x is x.","Answer: x."]','easy',1),
  (9,'algebraic-fractions','Simplify: 15x^2 / 5x','3x','Divide coefficients and subtract exponents.','["15 divided by 5 is 3.","x^2 divided by x is x.","Answer: 3x."]','medium',2),
  (9,'algebraic-fractions','Simplify: 3/x + 5/x','8/x','The denominators are equal.','["Add the numerators: 3 + 5.","Answer: 8/x."]','easy',1),
  (9,'algebraic-fractions','Simplify: 9x / 3','3x','Divide the coefficient by 3.','["9 divided by 3 is 3.","Answer: 3x."]','easy',1),

  -- Grade 9 · Simultaneous equations (6)
  (9,'simultaneous-equations','If x + y = 10 and y = 4, find x','6','Substitute y = 4.','["x + 4 = 10.","x = 6."]','easy',1),
  (9,'simultaneous-equations','If x + y = 9 and x - y = 3, find x','6','Add the equations to remove y.','["Add the equations: 2x = 12.","x = 6."]','medium',2),
  (9,'simultaneous-equations','If 2x + y = 11 and y = 3, find x','4','Substitute y = 3.','["2x + 3 = 11.","2x = 8.","x = 4."]','medium',2),
  (9,'simultaneous-equations','If x + y = 12 and x = 7, find y','5','Substitute x = 7.','["7 + y = 12.","y = 5."]','easy',1),
  (9,'simultaneous-equations','If x - y = 2 and y = 5, find x','7','Substitute y = 5.','["x - 5 = 2.","x = 7."]','easy',1),
  (9,'simultaneous-equations','If 3x + y = 10 and y = 1, find x','3','Substitute y = 1.','["3x + 1 = 10.","3x = 9.","x = 3."]','medium',2),

  -- Grade 9 · Exponents (6)
  (9,'exponents','Simplify: x^3 × x^4','x^7','Add exponents with the same base.','["Add the exponents: 3 + 4.","Answer: x^7."]','easy',1),
  (9,'exponents','Simplify: a^8 ÷ a^3','a^5','Subtract exponents with the same base.','["Subtract the exponents: 8 - 3.","Answer: a^5."]','easy',1),
  (9,'exponents','Simplify: (m^2)^3','m^6','Multiply the exponents.','["Multiply the exponents: 2 times 3.","Answer: m^6."]','medium',2),
  (9,'exponents','Evaluate: 2^-3','1/8','A negative exponent means reciprocal.','["2^-3 = 1 over 2^3.","Answer: 1/8."]','medium',2),
  (9,'exponents','Simplify: x^5 × x^2','x^7','Add exponents with the same base.','["Add the exponents: 5 + 2.","Answer: x^7."]','easy',1),
  (9,'exponents','Simplify: y^6 ÷ y^2','y^4','Subtract exponents with the same base.','["Subtract the exponents: 6 - 2.","Answer: y^4."]','easy',1),

  -- Grade 9 · Functions basics (6)
  (9,'functions','If f(x) = x + 2, find f(3)','5','Substitute 3 for x.','["f(3) = 3 + 2.","f(3) = 5."]','easy',1),
  (9,'functions','If f(x) = 2x, find f(4)','8','Substitute 4 for x.','["f(4) = 2 times 4.","f(4) = 8."]','easy',1),
  (9,'functions','If f(x) = 3x - 1, find f(2)','5','Substitute 2 for x.','["f(2) = 6 - 1.","f(2) = 5."]','medium',2),
  (9,'functions','If f(x) = x - 5, find f(9)','4','Substitute 9 for x.','["f(9) = 9 - 5.","f(9) = 4."]','easy',1),
  (9,'functions','If f(x) = 4x, find f(0)','0','Substitute 0 for x.','["f(0) = 4 times 0.","f(0) = 0."]','easy',1),
  (9,'functions','If f(x) = 2x + 1, find f(5)','11','Substitute 5 for x.','["f(5) = 10 + 1.","f(5) = 11."]','medium',2),

  -- Grade 9 · Number patterns (6)
  (9,'number-patterns','Find the next term: 3, 7, 11, 15, ...','19','Find the constant difference.','["Each term increases by 4.","15 + 4 = 19."]','easy',1),
  (9,'number-patterns','Find the next term: 5, 10, 15, 20, ...','25','Find the constant difference.','["Each term increases by 5.","20 + 5 = 25."]','easy',1),
  (9,'number-patterns','Find the nth term: 5, 8, 11, 14, ...','3n+2','Start with the common difference.','["Common difference is 3, so use 3n.","At n = 1 add 2 to get 5.","Tn = 3n + 2."]','medium',2),
  (9,'number-patterns','Find term 10 if Tn = 4n - 1','39','Substitute n = 10.','["T10 = 4(10) - 1.","T10 = 39."]','easy',1),
  (9,'number-patterns','Find the next term: 2, 4, 6, 8, ...','10','Find the constant difference.','["Each term increases by 2.","8 + 2 = 10."]','easy',1),
  (9,'number-patterns','Find the nth term: 4, 7, 10, 13, ...','3n+1','Start with the common difference.','["Common difference is 3, so use 3n.","At n = 1 add 1 to get 4.","Tn = 3n + 1."]','medium',2),

  -- Grade 10 · Factorisation (10)
  (10,'factorisation','Factorise: x^2 + 7x + 12','(x+3)(x+4)','Find factors of 12 that add to 7.','["3 and 4 multiply to 12 and add to 7.","Answer: (x + 3)(x + 4)."]','medium',2),
  (10,'factorisation','Factorise: x^2 + 9x + 20','(x+4)(x+5)','Find factors of 20 that add to 9.','["4 and 5 multiply to 20 and add to 9.","Answer: (x + 4)(x + 5)."]','medium',2),
  (10,'factorisation','Factorise: 4x^2 - 25','(2x-5)(2x+5)','Use the difference of squares.','["4x^2 = (2x)^2 and 25 = 5^2.","Answer: (2x - 5)(2x + 5)."]','medium',2),
  (10,'factorisation','Factorise: 9x^2 - 16','(3x-4)(3x+4)','Use the difference of squares.','["9x^2 = (3x)^2 and 16 = 4^2.","Answer: (3x - 4)(3x + 4)."]','medium',2),
  (10,'factorisation','Factorise: 2x^2 + 7x + 3','(2x+1)(x+3)','Split the middle term using 6 and 1.','["Split the middle term: 2x^2 + 6x + x + 3.","Group: 2x(x + 3) + 1(x + 3).","Answer: (2x + 1)(x + 3)."]','hard',3),
  (10,'factorisation','Factorise: 3x^2 + 10x + 3','(3x+1)(x+3)','Split the middle term using 9 and 1.','["Split the middle term: 3x^2 + 9x + x + 3.","Group: 3x(x + 3) + 1(x + 3).","Answer: (3x + 1)(x + 3)."]','hard',3),
  (10,'factorisation','Factorise: x^3 - 4x','x(x-2)(x+2)','Take out the common factor first.','["Take out x: x(x^2 - 4).","Factor the difference of squares.","Answer: x(x - 2)(x + 2)."]','hard',3),
  (10,'factorisation','Factorise: x^2 - 6x + 9','(x-3)(x-3)','Look for a perfect square trinomial.','["This is a perfect square.","Answer: (x - 3)(x - 3)."]','medium',2),
  (10,'factorisation','Factorise: x^2 + 2x - 15','(x+5)(x-3)','Find factors of -15 that add to 2.','["5 and -3 multiply to -15 and add to 2.","Answer: (x + 5)(x - 3)."]','medium',2),
  (10,'factorisation','Factorise: 2x^2 - 8','2(x-2)(x+2)','Take out the common factor 2 first.','["Take out 2: 2(x^2 - 4).","Factor the difference of squares.","Answer: 2(x - 2)(x + 2)."]','hard',3),

  -- Grade 10 · Linear equations (10)
  (10,'linear-equations','Solve: 2x + 5 = 17','6','Remove 5 first.','["2x = 12.","x = 6."]','easy',1),
  (10,'linear-equations','Solve: 3x - 7 = 14','7','Add 7 first.','["3x = 21.","x = 7."]','medium',2),
  (10,'linear-equations','Solve: 5x + 2 = 3x + 10','4','Collect x terms on one side.','["2x + 2 = 10.","2x = 8.","x = 4."]','medium',2),
  (10,'linear-equations','Solve: 4(x - 1) = 12','4','Expand the bracket first.','["4x - 4 = 12.","4x = 16.","x = 4."]','medium',2),
  (10,'linear-equations','Solve: 6x - 9 = 3x + 6','5','Collect x terms on one side.','["3x - 9 = 6.","3x = 15.","x = 5."]','hard',3),
  (10,'linear-equations','Solve: 2x / 3 = 4','6','Multiply both sides by 3.','["2x = 12.","x = 6."]','medium',2),
  (10,'linear-equations','Solve: 7x - 5 = 2x + 20','5','Collect x terms on one side.','["5x - 5 = 20.","5x = 25.","x = 5."]','hard',3),
  (10,'linear-equations','Solve: x + 12 = 3x','6','Collect x terms on one side.','["12 = 2x.","x = 6."]','medium',2),
  (10,'linear-equations','Solve: 10 - 2x = 4','3','Move 10 to the other side.','["-2x = -6.","x = 3."]','medium',2),
  (10,'linear-equations','Solve: 3(x + 2) = 2x + 11','5','Expand the bracket first.','["3x + 6 = 2x + 11.","x + 6 = 11.","x = 5."]','hard',3),

  -- Grade 10 · Functions basics (10)
  (10,'functions','If f(x) = 2x + 1, find f(3)','7','Substitute 3 for x.','["f(3) = 2(3) + 1.","f(3) = 7."]','easy',1),
  (10,'functions','If f(x) = 2x + 1, find f(0)','1','Substitute 0 for x.','["f(0) = 2(0) + 1.","f(0) = 1."]','easy',1),
  (10,'functions','If g(x) = x^2 - 4, find g(5)','21','Substitute 5 for x.','["g(5) = 25 - 4.","g(5) = 21."]','easy',1),
  (10,'functions','If g(x) = x^2 - 4, find g(2)','0','Substitute 2 for x.','["g(2) = 4 - 4.","g(2) = 0."]','medium',2),
  (10,'functions','If h(x) = 3x - 2, find h(4)','10','Substitute 4 for x.','["h(4) = 12 - 2.","h(4) = 10."]','easy',1),
  (10,'functions','If h(x) = 3x - 2 and h(x) = 13, find x','5','Set 3x - 2 equal to 13.','["3x - 2 = 13.","3x = 15.","x = 5."]','medium',2),
  (10,'functions','If f(x) = 5x, find f(-2)','-10','Substitute -2 for x.','["f(-2) = 5 times -2.","f(-2) = -10."]','medium',2),
  (10,'functions','If f(x) = x + 7, find f(-3)','4','Substitute -3 for x.','["f(-3) = -3 + 7.","f(-3) = 4."]','medium',2),
  (10,'functions','If f(x) = 2x - 1 and f(x) = 9, find x','5','Set 2x - 1 equal to 9.','["2x - 1 = 9.","2x = 10.","x = 5."]','medium',2),
  (10,'functions','If g(x) = x^2, find g(-3)','9','Substitute -3 for x.','["g(-3) = (-3)^2.","g(-3) = 9."]','medium',2),

  -- Grade 10 · Algebraic fractions (6)
  (10,'algebraic-fractions','Simplify: (x^2 - 9) / (x - 3)','x+3','Factor the numerator first.','["x^2 - 9 = (x - 3)(x + 3).","Cancel x - 3.","Answer: x + 3."]','medium',2),
  (10,'algebraic-fractions','Simplify: 6x / 3','2x','Divide the coefficient by 3.','["6 divided by 3 is 2.","Answer: 2x."]','easy',1),
  (10,'algebraic-fractions','Simplify: 2/x + 3/x','5/x','The denominators are equal.','["Add the numerators: 2 + 3.","Answer: 5/x."]','easy',1),
  (10,'algebraic-fractions','Solve: 3/x = 6','1/2','Multiply both sides by x.','["Multiply both sides by x: 3 = 6x.","x = 3/6 = 1/2."]','medium',2),
  (10,'algebraic-fractions','Simplify: (x^2 - 4) / (x - 2)','x+2','Factor the numerator first.','["x^2 - 4 = (x - 2)(x + 2).","Cancel x - 2.","Answer: x + 2."]','medium',2),
  (10,'algebraic-fractions','Simplify: 8x^2 / 2x','4x','Divide coefficients and subtract exponents.','["8 divided by 2 is 4.","x^2 divided by x is x.","Answer: 4x."]','medium',2),

  -- Grade 10 · Simultaneous equations (6)
  (10,'simultaneous-equations','If x + y = 10 and y = 4, find x','6','Substitute y = 4.','["x + 4 = 10.","x = 6."]','easy',1),
  (10,'simultaneous-equations','If x + y = 9 and x - y = 3, find x','6','Add the equations to remove y.','["Add the equations: 2x = 12.","x = 6."]','medium',2),
  (10,'simultaneous-equations','If 2x + y = 11 and y = 3, find x','4','Substitute y = 3.','["2x + 3 = 11.","2x = 8.","x = 4."]','medium',2),
  (10,'simultaneous-equations','If x + y = 8 and x - y = 2, find x','5','Add the equations to remove y.','["Add the equations: 2x = 10.","x = 5."]','medium',2),
  (10,'simultaneous-equations','If 3x + 2y = 12 and y = 0, find x','4','Substitute y = 0.','["3x + 0 = 12.","3x = 12.","x = 4."]','medium',2),
  (10,'simultaneous-equations','If x + y = 15 and x = 9, find y','6','Substitute x = 9.','["9 + y = 15.","y = 6."]','easy',1),

  -- Grade 10 · Exponents (6)
  (10,'exponents','Simplify: x^4 × x^3','x^7','Add exponents with the same base.','["Add the exponents: 4 + 3.","Answer: x^7."]','easy',1),
  (10,'exponents','Simplify: a^10 ÷ a^4','a^6','Subtract exponents with the same base.','["Subtract the exponents: 10 - 4.","Answer: a^6."]','easy',1),
  (10,'exponents','Simplify: (x^3)^2','x^6','Multiply the exponents.','["Multiply the exponents: 3 times 2.","Answer: x^6."]','medium',2),
  (10,'exponents','Evaluate: 3^-2','1/9','A negative exponent means reciprocal.','["3^-2 = 1 over 3^2.","Answer: 1/9."]','medium',2),
  (10,'exponents','Evaluate: 2^0','1','Any nonzero base to the power 0 is 1.','["Any nonzero base to the power 0 is 1.","Answer: 1."]','easy',1),
  (10,'exponents','Simplify: (2x^2)^2','4x^4','Square each factor inside the bracket.','["Square 2 and square x^2.","4 times x^4.","Answer: 4x^4."]','hard',3),

  -- Grade 10 · Number patterns (6)
  (10,'number-patterns','Find the next term: 2, 5, 8, 11, ...','14','Find the constant difference.','["Each term increases by 3.","11 + 3 = 14."]','easy',1),
  (10,'number-patterns','Find the nth term: 7, 9, 11, 13, ...','2n+5','Start with the common difference.','["Common difference is 2, so use 2n.","At n = 1 add 5 to get 7.","Tn = 2n + 5."]','medium',2),
  (10,'number-patterns','Find term 5 if Tn = 2n + 3','13','Substitute n = 5.','["T5 = 2(5) + 3.","T5 = 13."]','easy',1),
  (10,'number-patterns','Find the next term: 100, 90, 80, ...','70','Find the constant difference.','["Each term decreases by 10.","80 - 10 = 70."]','easy',1),
  (10,'number-patterns','Find the nth term: 6, 11, 16, 21, ...','5n+1','Start with the common difference.','["Common difference is 5, so use 5n.","At n = 1 add 1 to get 6.","Tn = 5n + 1."]','medium',2),
  (10,'number-patterns','Find term 8 if Tn = 3n - 2','22','Substitute n = 8.','["T8 = 3(8) - 2.","T8 = 22."]','medium',2)
)
insert into public.questions (topic_id, grade, question_text, answer_text, hint, solution_steps, difficulty, marks, is_active)
select t.id, s.grade, s.question_text, s.answer_text, s.hint, s.steps, s.difficulty, s.marks, true
from seed s
join public.topics t on t.grade = s.grade and t.slug = s.slug
where not exists (
  select 1 from public.questions q
  where q.topic_id = t.id and q.question_text = s.question_text
);

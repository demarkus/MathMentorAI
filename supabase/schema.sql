create extension if not exists pgcrypto;

create type public.user_role as enum ('student', 'parent', 'teacher', 'admin');
create type public.question_difficulty as enum ('easy', 'medium', 'hard');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role public.user_role,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references public.profiles(id) on delete cascade,
  grade integer not null check (grade in (9, 10)),
  school_name text,
  target_score integer check (target_score between 0 and 100),
  created_at timestamptz not null default now()
);

create table public.topics (
  id uuid primary key default gen_random_uuid(),
  grade integer not null check (grade in (9, 10)),
  name text not null,
  slug text not null,
  description text not null,
  curriculum_tag text not null default 'CAPS',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (grade, slug)
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references public.topics(id) on delete cascade,
  grade integer not null check (grade in (9, 10)),
  question_text text not null,
  answer_text text not null,
  hint text not null,
  solution_steps jsonb not null check (jsonb_typeof(solution_steps) = 'array'),
  difficulty public.question_difficulty not null default 'medium',
  cognitive_level text not null default 'routine procedure',
  marks integer not null default 1 check (marks > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.learner_profiles(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  submitted_answer text not null,
  is_correct boolean not null,
  score numeric not null default 0 check (score >= 0),
  time_spent_seconds integer check (time_spent_seconds >= 0),
  created_at timestamptz not null default now()
);

create index attempts_learner_created_idx on public.attempts (learner_id, created_at desc);
create index questions_topic_active_idx on public.questions (topic_id, is_active);

alter table public.profiles enable row level security;
alter table public.learner_profiles enable row level security;
alter table public.topics enable row level security;
alter table public.questions enable row level security;
alter table public.attempts enable row level security;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.learner_profiles to authenticated;
grant select on public.topics, public.questions to anon, authenticated;
grant select, insert on public.attempts to authenticated;

create policy "profiles_select_own" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "learner_profiles_select_own" on public.learner_profiles for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "learner_profiles_insert_own" on public.learner_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "learner_profiles_update_own" on public.learner_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "topics_readable" on public.topics for select to anon, authenticated using (true);
create policy "active_questions_readable" on public.questions for select to anon, authenticated using (is_active);
create policy "attempts_select_own" on public.attempts for select to authenticated
  using (exists (select 1 from public.learner_profiles lp where lp.id = learner_id and lp.user_id = (select auth.uid())));
create policy "attempts_insert_own" on public.attempts for insert to authenticated
  with check (exists (select 1 from public.learner_profiles lp where lp.id = learner_id and lp.user_id = (select auth.uid())));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  
return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table public.teacher_resources (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  grade integer not null check (grade in (9, 10)),
  topic_id uuid references public.topics(id) on delete set null,
  resource_type text not null check (resource_type in ('worksheet', 'test', 'memo', 'revision_pack')),
  content jsonb not null default '{}'::jsonb check (jsonb_typeof(content) = 'object'),
  created_at timestamptz not null default now()
);

create index teacher_resources_teacher_id_idx on public.teacher_resources (teacher_id);
create index teacher_resources_topic_id_idx on public.teacher_resources (topic_id);
create index teacher_resources_created_at_idx on public.teacher_resources (created_at desc);

alter table public.teacher_resources enable row level security;

grant select, insert, update, delete on public.teacher_resources to authenticated;

create policy "teacher_resources_select_own" on public.teacher_resources for select to authenticated
  using ((select auth.uid()) = teacher_id);
create policy "teacher_resources_insert_own" on public.teacher_resources for insert to authenticated
  with check ((select auth.uid()) = teacher_id);
create policy "teacher_resources_update_own" on public.teacher_resources for update to authenticated
  using ((select auth.uid()) = teacher_id) with check ((select auth.uid()) = teacher_id);
create policy "teacher_resources_delete_own" on public.teacher_resources for delete to authenticated
  using ((select auth.uid()) = teacher_id);
create policy "teacher_resources_select_admin" on public.teacher_resources for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

create table public.beta_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  role text not null check (role in ('learner', 'parent', 'teacher', 'tutor', 'school_admin')),
  selected_plan text not null,
  message text,
  created_at timestamptz not null default now()
);

create index beta_leads_email_idx on public.beta_leads (email);
create index beta_leads_role_idx on public.beta_leads (role);
create index beta_leads_created_at_idx on public.beta_leads (created_at desc);

alter table public.beta_leads enable row level security;

grant insert on public.beta_leads to anon, authenticated;
grant select on public.beta_leads to authenticated;

create policy "beta_leads_insert_public" on public.beta_leads for insert to anon, authenticated
  with check (true);
create policy "beta_leads_select_admin" on public.beta_leads for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

with seed(grade, slug, question_text, answer_text, hint, steps, difficulty, marks) as (
  values
  (9,'factorisation','Factorise: 6x + 12','6(x+2)','Find the highest common factor.','["The HCF is 6.","Take 6 outside: 6(x + 2)."]'::jsonb,'easy'::public.question_difficulty,1),
  (9,'factorisation','Factorise: 8a - 20','4(2a-5)','Both terms divide by 4.','["The HCF is 4.","8a - 20 = 4(2a - 5)."]'::jsonb,'easy',1),
  (9,'factorisation','Factorise: x² + 5x + 6','(x+2)(x+3)','Find factors of 6 that add to 5.','["2 × 3 = 6 and 2 + 3 = 5.","Answer: (x + 2)(x + 3)."]'::jsonb,'medium',2),
  (9,'factorisation','Factorise: x² - 9','(x-3)(x+3)','Use difference of squares.','["x² - 3² is a difference of squares.","Answer: (x - 3)(x + 3)."]'::jsonb,'medium',2),
  (9,'linear-equations','Solve: x + 7 = 15','8','Undo adding 7.','["Subtract 7 from both sides.","x = 8."]'::jsonb,'easy',1),
  (9,'linear-equations','Solve: 3x = 21','7','Divide both sides by 3.','["3x ÷ 3 = 21 ÷ 3.","x = 7."]'::jsonb,'easy',1),
  (9,'linear-equations','Solve: 2x + 5 = 17','6','Remove 5 before dividing by 2.','["2x = 12.","x = 6."]'::jsonb,'medium',2),
  (9,'linear-equations','Solve: 5x - 8 = 2x + 13','7','Collect x terms on one side.','["3x - 8 = 13.","3x = 21.","x = 7."]'::jsonb,'hard',3),
  (9,'exponents','Simplify: x³ × x⁴','x^7','Add exponents with the same base.','["3 + 4 = 7.","Answer: x⁷."]'::jsonb,'easy',1),
  (9,'exponents','Simplify: a⁸ ÷ a³','a^5','Subtract exponents.','["8 - 3 = 5.","Answer: a⁵."]'::jsonb,'easy',1),
  (9,'exponents','Simplify: (m²)³','m^6','Multiply the exponents.','["2 × 3 = 6.","Answer: m⁶."]'::jsonb,'medium',1),
  (9,'exponents','Evaluate: 2⁻³','1/8','A negative exponent means reciprocal.','["2⁻³ = 1 / 2³.","Answer: 1/8."]'::jsonb,'medium',2),
  (9,'number-patterns','Find the next term: 3, 7, 11, 15, ...','19','Find the constant difference.','["Each term increases by 4.","15 + 4 = 19."]'::jsonb,'easy',1),
  (9,'number-patterns','Find the nth term: 5, 8, 11, 14, ...','3n+2','Start with the common difference.','["The common difference is 3, so use 3n.","At n=1 add 2 to get 5.","Tn = 3n + 2."]'::jsonb,'medium',2),
  (9,'number-patterns','Find term 10 if Tn = 4n - 1','39','Substitute n = 10.','["T10 = 4(10) - 1.","T10 = 39."]'::jsonb,'easy',1),
  (10,'factorisation','Factorise: x² + 7x + 12','(x+3)(x+4)','Find factors of 12 that add to 7.','["3 × 4 = 12 and 3 + 4 = 7.","Answer: (x + 3)(x + 4)."]'::jsonb,'medium',2),
  (10,'factorisation','Factorise: 4x² - 25','(2x-5)(2x+5)','Use difference of squares.','["4x² = (2x)² and 25 = 5².","Answer: (2x - 5)(2x + 5)."]'::jsonb,'medium',2),
  (10,'factorisation','Factorise: 2x² + 7x + 3','(2x+1)(x+3)','Split the middle term using 6 and 1.','["2x² + 6x + x + 3.","Group terms.","Answer: (2x + 1)(x + 3)."]'::jsonb,'hard',3),
  (10,'factorisation','Factorise: x³ - 4x','x(x-2)(x+2)','Take out x first.','["x(x² - 4).","Factor the difference of squares.","Answer: x(x - 2)(x + 2)."]'::jsonb,'hard',3),
  (10,'algebraic-fractions','Simplify: 6x/3','2x','Divide the coefficient by 3.','["6 ÷ 3 = 2.","Answer: 2x."]'::jsonb,'easy',1),
  (10,'algebraic-fractions','Simplify: (x² - 9)/(x - 3)','x+3','Factor the numerator first.','["x² - 9 = (x - 3)(x + 3).","Cancel x - 3.","Answer: x + 3."]'::jsonb,'medium',2),
  (10,'algebraic-fractions','Simplify: 2/x + 3/x','5/x','The denominators are already equal.','["Add the numerators: 2 + 3.","Answer: 5/x."]'::jsonb,'easy',1),
  (10,'algebraic-fractions','Solve: 3/x = 6','1/2','Multiply both sides by x.','["3 = 6x.","x = 3/6 = 1/2."]'::jsonb,'medium',2),
  (10,'simultaneous-equations','Solve for x: x + y = 10 and y = 4','6','Substitute y = 4.','["x + 4 = 10.","x = 6."]'::jsonb,'easy',1),
  (10,'simultaneous-equations','If x + y = 9 and x - y = 3, find x','6','Add the equations to eliminate y.','["2x = 12.","x = 6."]'::jsonb,'medium',2),
  (10,'simultaneous-equations','If 2x + y = 11 and y = 3, find x','4','Substitute 3 for y.','["2x + 3 = 11.","2x = 8.","x = 4."]'::jsonb,'medium',2),
  (10,'functions','If f(x) = 2x + 1, find f(3)','7','Substitute 3 for x.','["f(3) = 2(3) + 1.","f(3) = 7."]'::jsonb,'easy',1),
  (10,'functions','If g(x) = x² - 4, find g(5)','21','Substitute x = 5.','["g(5) = 25 - 4.","g(5) = 21."]'::jsonb,'easy',1),
  (10,'functions','If h(x) = 3x - 2 and h(x) = 13, find x','5','Set 3x - 2 equal to 13.','["3x - 2 = 13.","3x = 15.","x = 5."]'::jsonb,'medium',2),
  (10,'exam-revision','Solve: x² - 5x + 6 = 0','x=2orx=3','Factorise, then use the zero-product rule.','["(x - 2)(x - 3) = 0.","x - 2 = 0 or x - 3 = 0.","x = 2 or x = 3."]'::jsonb,'hard',3)
)

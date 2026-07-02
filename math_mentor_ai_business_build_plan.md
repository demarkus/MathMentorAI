# Math Mentor AI — Five-Month Income & Build Plan

## 1. Executive Summary

**Math Mentor AI** is a focused EdTech product ecosystem designed to generate income within five months by combining three related products into one practical platform:

1. **Math Mentor Student** — guided maths practice and exam preparation for learners.
2. **TeacherMate Maths** — worksheet, test, memo, and marking guideline generator for teachers.
3. **Student Focus & Exam Planner** — productivity, study scheduling, Pomodoro, exam planning, and progress tracking.

The first commercial product should be a narrow, sellable MVP:

> **Math Mentor AI: Grade 9 & 10 Algebra Booster**

The goal is to help South African learners improve in mathematics through structured practice, step-by-step guidance, topic mastery, progress reports, and exam preparation.

The quickest route to revenue is to launch a paid beta programme for parents and learners while simultaneously testing a teacher-focused worksheet generator.

---

## 2. Core Business Thesis

The app should not be positioned as another generic AI chatbot or homework solver.

It should be positioned as:

> **A teacher-guided maths improvement system for learners, parents, and teachers.**

The strongest emotional buying trigger is:

> “My child is struggling with maths and needs help before tests or exams.”

This creates an urgent reason for parents to pay.

Teachers also have a strong need:

> “I need high-quality worksheets, tests, marking guidelines, and remediation tasks quickly.”

The product should therefore serve two fast-paying customer groups first:

- **Parents of Grade 9 and Grade 10 learners**
- **Mathematics teachers and tutors**

Schools can be approached later because institutional sales cycles are slower.

---

## 3. Brand Structure

### Main Brand

**Math Mentor AI**

### First Product

**Algebra Booster**

### Student Module

**Math Mentor Student**

### Teacher Module

**TeacherMate Maths**

### Productivity Module

**Student Focus & Exam Planner**

---

## 4. Target Market

### Primary Customers

| Customer | Main Pain | Monetization Potential |
|---|---|---|
| Parents | Child is struggling with mathematics | High |
| Learners | Need help after school and before exams | Medium, usually parent-funded |
| Teachers | Need worksheets, tests, memos, and marking guidelines | High |
| Tutors | Need content and learner progress tracking | High |
| Small tutoring centres | Need group management and reports | High |

### Initial Geographic Focus

Start with:

- South Africa
- CAPS-aligned Grade 9 and Grade 10 mathematics
- Algebra-focused exam support

Later expansion:

- Grade 8 to Grade 12
- Ghana curriculum support
- UK GCSE support
- International algebra practice

---

## 5. First MVP Focus

The MVP should focus only on:

> **Grade 9 and Grade 10 Algebra**

### Initial Topics

- Factorisation
- Algebraic fractions
- Linear equations
- Simultaneous equations
- Exponents and laws of indices
- Functions basics
- Number patterns
- Exam-style algebra revision

### Why Start Narrow?

Starting narrow improves speed, quality, marketing clarity, and trust.

A focused product is easier to sell:

> “Grade 9 & 10 Algebra Booster for South African Learners.”

This is clearer than:

> “AI learning platform for everyone.”

---

## 6. Product Modules

## 6.1 Math Mentor Student

### Purpose

Help learners practise mathematics daily, understand mistakes, and prepare for tests and exams.

### Core Features

| Feature | Description |
|---|---|
| Student dashboard | Shows today’s practice, progress, and weak areas |
| Diagnostic test | Identifies weak topics |
| Topic practice | Learners practise selected algebra topics |
| Step-by-step hints | Learners receive hints before full solutions |
| AI explanation | Explains solutions conversationally |
| Mistake review | Shows questions answered incorrectly |
| Exam mode | Timed mini-tests and exam-style questions |
| Streaks | Encourages daily consistency |
| Readiness score | Simple exam preparation score |

---

## 6.2 Parent Progress Reports

### Purpose

Give parents visibility into the learner’s progress.

### Core Features

| Feature | Description |
|---|---|
| Weekly report | Summarizes learner activity and performance |
| Topic risk alerts | Shows weak topics needing attention |
| Accuracy trends | Tracks improvement over time |
| Exam readiness score | Gives a simple score parents can understand |
| Recommended plan | Suggests what the learner should practise next |
| PDF export | Generates downloadable or shareable reports |
| WhatsApp share | Allows easy sharing of reports |

### Example Parent Report Metrics

| Topic | Score | Status |
|---|---:|---|
| Factorisation | 42% | High Risk |
| Algebraic Fractions | 35% | Critical |
| Linear Equations | 76% | Improving |
| Exponents | 68% | Moderate |

---

## 6.3 TeacherMate Maths

### Purpose

Help mathematics teachers and tutors generate teaching resources quickly.

### Core Features

| Feature | Description |
|---|---|
| Worksheet generator | Creates CAPS-aligned worksheets |
| Test generator | Creates short tests and revision activities |
| Memo generator | Generates step-by-step answers |
| Marking guidelines | Creates concise marking guidelines |
| Cognitive level breakdown | Categorizes questions by difficulty/cognitive demand |
| Remediation tasks | Generates extra practice for weak learners |
| PDF export | Allows teachers to download resources |
| Class topic analysis | Later feature for teacher dashboards |

### Example Teacher Prompt

> Generate a 20-mark Grade 10 algebra test on factorisation and algebraic fractions with memo, marking guideline, and cognitive level breakdown.

---

## 6.4 Student Focus & Exam Planner

### Purpose

Reuse the productivity strengths from Daily Goals Tracker and position them for students.

### Core Features

| Feature | Description |
|---|---|
| Daily study goals | Learners plan daily academic goals |
| Weekly study schedule | Learners organize subjects and study blocks |
| Pomodoro timer | Focus sessions for studying |
| Site blocker | Blocks distracting websites during focus sessions |
| Exam countdown | Tracks upcoming assessments |
| Subject goals | Sets targets per subject |
| Reflection journal | Learners reflect on study progress |
| Focus history | Tracks consistency and effort |

This module should support the maths learning product rather than compete with it.

---

## 7. MVP Feature Scope

### Include in Version 1

| Feature | Priority |
|---|---|
| Landing page | Must-have |
| Signup/login | Must-have |
| Student dashboard | Must-have |
| Diagnostic quiz | Must-have |
| Topic practice | Must-have |
| Scoring engine | Must-have |
| Mistake tracking | Must-have |
| AI explanations | Must-have |
| Parent report page | Must-have |
| PDF report export | Must-have |
| Teacher worksheet generator | Must-have |
| Teacher memo generator | Must-have |
| Payment integration | Must-have |
| Admin dashboard | Must-have |
| WhatsApp sharing | Should-have |
| Exam mode | Should-have |
| Streaks | Should-have |

### Exclude from Version 1

| Feature | Reason |
|---|---|
| Native Android/iOS app | Slower to launch |
| Full LMS | Too large for MVP |
| School-wide admin dashboard | Better for later B2B version |
| Video lessons | Content-heavy |
| Voice tutor | Later premium feature |
| Advanced gamification | Not needed for first revenue |
| Full Grade 8–12 coverage | Too broad |

---

## 8. Recommended Tech Stack

### Application Type

Build as a:

> **Responsive web app + PWA**

This is faster than building native mobile apps and works well on phones, tablets, and laptops.

### Suggested Stack

| Layer | Recommended Tool |
|---|---|
| Frontend | Next.js + TypeScript |
| Styling | Tailwind CSS |
| Backend | Next.js API routes or FastAPI |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| Payments | PayFast, Yoco, or Stripe |
| AI | OpenAI API |
| Hosting | Vercel |
| Analytics | PostHog or simple internal analytics |
| PDF generation | React PDF or server-side PDF generator |
| Messaging | WhatsApp share links first |
| Version control | GitHub |
| Development assistant | Codex |

---

## 9. AI Safety and Quality Rules

The app should not simply dump final answers.

### AI Design Principles

1. Give hints before final solutions.
2. Encourage learners to attempt questions first.
3. Explain reasoning step by step.
4. Use verified question templates where possible.
5. Validate answers with deterministic logic for structured questions.
6. Keep teacher-reviewed examples.
7. Add a “Report issue” button.
8. Avoid positioning the app as a homework cheating tool.

### Recommended AI Flow

1. Learner attempts question.
2. App checks answer.
3. If incorrect, app gives a hint.
4. Learner tries again.
5. App gives step-by-step explanation.
6. App records topic weakness.
7. App updates readiness score.

---

## 10. Monetization Strategy

## 10.1 Parent/Learner Plans

| Plan | Suggested Price |
|---|---:|
| 4-week beta | R199–R299 once-off |
| Monthly learner plan | R149–R249/month |
| Term package | R499–R699/term |
| Exam bootcamp | R199–R399 once-off |

### First Offer

> **Grade 9 & 10 Algebra Booster Beta — R199 for 4 weeks**

Includes:

- Diagnostic test
- Daily algebra practice
- Step-by-step explanations
- Weekly progress report
- Exam readiness score
- Printable revision pack

---

## 10.2 Teacher Plans

| Plan | Suggested Price |
|---|---:|
| Free | 3 generations/month |
| Teacher Basic | R79/month |
| Teacher Pro | R149/month |
| School Pack | R999/month for 10 teachers |

---

## 10.3 Digital Products

| Product | Suggested Price |
|---|---:|
| Grade 9 Algebra Revision Pack | R49–R99 |
| Grade 10 Factorisation Pack | R49–R99 |
| Algebraic Fractions Workbook | R99 |
| Exam Booster Bundle | R199–R399 |
| Teacher Test Pack | R99–R199 |

Digital products can generate revenue before the SaaS product is fully mature.

---

## 11. Five-Month Roadmap

## Month 1 — Validate and Pre-Sell

### Goal

Get paying interest before building too much.

### Tasks

- Create landing page.
- Create WhatsApp interest form.
- Create sample Grade 9/10 diagnostic test.
- Create sample parent report.
- Create sample teacher worksheet.
- Talk to 20 parents.
- Talk to 10 teachers.
- Talk to 3 tutors.
- Offer paid beta access.

### Deliverables

- Landing page
- Demo video
- 3 sample PDFs
- Beta signup form
- Pricing page

### Success Metrics

- 50 leads
- 10 paid beta users
- 5 teacher testers

---

## Month 2 — Build MVP

### Goal

Learners can practise, receive feedback, and generate a progress report.

### Tasks

- Build authentication.
- Build learner profile.
- Build topic database.
- Build question bank.
- Build quiz engine.
- Build scoring engine.
- Build AI explanation endpoint.
- Build parent report screen.
- Build teacher worksheet generator.
- Build admin dashboard.

### Success Metrics

- 30 active learners
- 10 paying users
- 5 teachers generating worksheets

---

## Month 3 — Public Beta Launch

### Goal

Make the app usable without manual onboarding.

### Tasks

- Add payment integration.
- Add subscription access control.
- Improve UI/UX.
- Add WhatsApp sharing.
- Add PDF export.
- Add topic mastery dashboard.
- Add basic teacher dashboard.
- Begin daily marketing.

### Marketing Channels

- WhatsApp groups
- Facebook parent groups
- Teacher groups
- Local school networks
- Tutor networks
- TikTok/Reels maths tips
- Personal network

### Success Metrics

- 100 registered users
- 30 paying users
- R5,000–R15,000 revenue

---

## Month 4 — Exam Campaign

### Goal

Package the app around exams and revision urgency.

### Campaign

> **21-Day Algebra Exam Rescue Programme**

Includes:

- Diagnostic test
- Daily practice
- Timed mini-tests
- Parent report
- Printable revision pack
- Exam readiness score

### Success Metrics

- 100–200 paid customers
- R20,000–R50,000 campaign revenue

---

## Month 5 — Scale the Winning Segment

### Goal

Double down on the customer group that pays fastest.

### Possible Directions

| Best Paying Segment | Build Next |
|---|---|
| Parents | Improve student and parent dashboard |
| Teachers | Improve worksheet/test generator |
| Tutors | Add group/class management |
| Schools | Add bulk reporting and admin controls |

### Success Metrics

- R25,000–R50,000/month recurring or semi-recurring revenue target
- Clear product-market direction
- Stable MVP
- Repeatable customer acquisition channel

---

## 12. First Database Schema

## 12.1 Users

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  full_name text,
  role text check (role in ('student', 'parent', 'teacher', 'admin')) not null,
  created_at timestamptz default now()
);
```

## 12.2 Learner Profiles

```sql
create table learner_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  grade int not null,
  school_name text,
  target_score int,
  created_at timestamptz default now()
);
```

## 12.3 Topics

```sql
create table topics (
  id uuid primary key default gen_random_uuid(),
  grade int not null,
  name text not null,
  description text,
  curriculum_tag text,
  created_at timestamptz default now()
);
```

## 12.4 Questions

```sql
create table questions (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid references topics(id) on delete cascade,
  grade int not null,
  question_text text not null,
  answer_text text not null,
  solution_steps jsonb,
  difficulty text check (difficulty in ('easy', 'medium', 'hard')) default 'medium',
  cognitive_level text,
  marks int default 1,
  created_at timestamptz default now()
);
```

## 12.5 Attempts

```sql
create table attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid references learner_profiles(id) on delete cascade,
  question_id uuid references questions(id) on delete cascade,
  submitted_answer text,
  is_correct boolean,
  score numeric,
  time_spent_seconds int,
  created_at timestamptz default now()
);
```

## 12.6 Reports

```sql
create table reports (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid references learner_profiles(id) on delete cascade,
  report_type text check (report_type in ('weekly', 'diagnostic', 'exam_readiness')),
  summary jsonb not null,
  pdf_url text,
  created_at timestamptz default now()
);
```

## 12.7 Teacher Resources

```sql
create table teacher_resources (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references users(id) on delete cascade,
  title text not null,
  grade int not null,
  topic text not null,
  resource_type text check (resource_type in ('worksheet', 'test', 'memo', 'marking_guideline', 'revision_pack')),
  content jsonb not null,
  pdf_url text,
  created_at timestamptz default now()
);
```

## 12.8 Subscriptions

```sql
create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  plan_name text not null,
  status text check (status in ('active', 'inactive', 'cancelled', 'past_due')) default 'inactive',
  payment_provider text,
  provider_customer_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz default now()
);
```

---

## 13. MVP Screen List

| Screen | Purpose |
|---|---|
| Landing page | Convert parents and teachers |
| Pricing page | Explain plans and offers |
| Signup/login | Account access |
| Role selection | Student, parent, teacher |
| Student dashboard | Practice overview |
| Diagnostic quiz | Identify weak topics |
| Practice screen | Answer questions |
| Hint/explanation screen | Guided learning |
| Mistake review | Revise incorrect questions |
| Progress dashboard | Show mastery and readiness |
| Parent report page | Summarize learner progress |
| Teacher generator | Create worksheets/tests/memos |
| Teacher resources page | View generated materials |
| Admin dashboard | Manage users, questions, and content |

---

## 14. First Development Sprint for Codex

## Sprint 1 Goal

Build the foundation for the Math Mentor AI MVP.

### Sprint 1 Tasks

1. Create Next.js + TypeScript project.
2. Add Tailwind CSS.
3. Set up Supabase client.
4. Create database schema.
5. Add authentication flow.
6. Add role selection after signup.
7. Build landing page.
8. Build student dashboard shell.
9. Build teacher dashboard shell.
10. Seed Grade 9 and Grade 10 algebra topics.
11. Seed first 30 algebra questions.
12. Build basic quiz engine.
13. Record learner attempts.
14. Display basic topic score.
15. Add admin-only question management page.

### Sprint 1 Acceptance Criteria

- User can sign up and log in.
- User can select role.
- Student can see dashboard.
- Student can answer quiz questions.
- Attempt is saved to database.
- Student can see score by topic.
- Teacher can access teacher dashboard shell.
- Admin can view seeded questions.

---

## 15. First Marketing Campaign Copy

## Parent Beta Post

```text
Is your child struggling with Grade 9 or Grade 10 Mathematics?

I am launching a small beta programme called Math Mentor AI — an Algebra Booster designed to help learners practise key maths topics, identify weak areas, and receive step-by-step guidance.

The programme includes:

✅ Diagnostic test
✅ Daily algebra practice
✅ Step-by-step explanations
✅ Weekly progress report
✅ Exam readiness score
✅ Parent feedback summary

I am accepting a limited number of learners for the first beta group.

Early beta fee: R199 for 4 weeks.

Suitable for learners who need help with factorisation, algebraic fractions, equations, and exam revision.

Send me a message if you would like your child to join the beta group.
```

## Teacher Beta Post

```text
Mathematics teachers: I am testing a new tool that helps generate CAPS-aligned maths worksheets, tests, marking guidelines, and remediation activities within minutes.

The first version focuses on Grade 9 and Grade 10 algebra topics such as factorisation, algebraic fractions, equations, and functions.

The tool can help you create:

✅ Class worksheets
✅ Test questions
✅ Marking guidelines
✅ Cognitive level breakdowns
✅ Revision activities
✅ Remediation tasks for weak learners

I am looking for a small group of teachers to test the beta version and give feedback.

Beta access will be limited.
```

---

## 16. Key Risks and Controls

| Risk | Control |
|---|---|
| Building too much before selling | Launch paid beta first |
| Serving too many grades | Start with Grade 9 and 10 algebra |
| AI gives incorrect maths | Use verified templates and validation |
| Parents do not understand product | Sell “Algebra Booster” instead of abstract platform |
| Teachers do not pay | Offer free limited generations, then Pro plan |
| Schools move slowly | Start with parents, teachers, and tutors |
| Weak marketing | Daily WhatsApp/Facebook/TikTok outreach |
| Poor learner engagement | Add streaks, reports, and exam goals |

---

## 17. Best Initial Revenue Target

### Conservative Target

| Source | Customers | Price | Revenue |
|---|---:|---:|---:|
| Parent beta | 30 | R199 | R5,970 |
| Teacher Basic | 20 | R79/month | R1,580/month |
| Exam packs | 50 | R99 | R4,950 |

### Strong Five-Month Target

| Source | Revenue |
|---|---:|
| Parent subscriptions | R15,000–R30,000/month |
| Teacher subscriptions | R10,000–R25,000/month |
| Exam packs | R10,000–R40,000 per campaign |
| Tutor/school packages | R5,000–R20,000/month |

Target outcome:

> **R25,000–R50,000/month recurring or semi-recurring revenue within five months.**

---

## 18. Codex Build Instruction

Use this document as the product blueprint.

The first Codex task should be:

> Build the initial Next.js + TypeScript + Tailwind + Supabase MVP for Math Mentor AI, starting with authentication, role selection, topic seeding, quiz engine, learner attempts, and a basic student dashboard.

Recommended first repository name:

```text
math-mentor-ai
```

Recommended initial branches:

```text
main
mvp-foundation
teacher-generator
payment-beta
exam-campaign
```

---

## 19. Immediate Next Steps

1. Create GitHub repository: `math-mentor-ai`.
2. Start a Next.js + TypeScript project.
3. Configure Tailwind CSS.
4. Create Supabase project.
5. Apply database schema.
6. Seed Grade 9 and Grade 10 algebra topics.
7. Seed first 30 questions.
8. Build authentication.
9. Build student quiz flow.
10. Build teacher generator shell.
11. Create landing page.
12. Start collecting beta signups.
13. Sell first 10 beta slots manually.

---

## 20. Product Direction Summary

The recommended path is:

> Build a small Grade 9/10 algebra practice and reporting app, sell a 4-week beta to parents, add a worksheet generator for teachers, then turn the best-performing part into a monthly subscription.

The strongest starting product is:

> **Math Mentor AI: Algebra Booster**

The strongest income combination is:

1. Parent-paid learner programme
2. Teacher worksheet/test generator
3. Student focus and exam planner
4. Digital revision packs
5. Tutor centre subscriptions

This gives the app multiple paths to income while still keeping the first MVP focused and buildable.

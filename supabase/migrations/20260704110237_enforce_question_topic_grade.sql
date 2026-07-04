-- Enforce that a question's grade matches the grade of its topic.
--
-- Previously questions.grade and questions.topic_id were independent: an admin
-- could file a Grade 9 topic's question under Grade 10 (or vice-versa). Such a
-- question would render in topic practice (which filters by topic) but then be
-- rejected at submission time (which filters by topic_id AND grade), stranding
-- the learner. This closes the gap declaratively with a composite foreign key.
--
-- Approach: a composite FK questions(topic_id, grade) -> topics(id, grade). The
-- referenced pair must be unique, so we first add a unique constraint on
-- topics(id, grade) (id is already the PK, so this never rejects existing data).
-- The FK then guarantees every question's (topic_id, grade) pair exists in
-- topics, i.e. the question's grade equals its topic's grade.
--
-- Additive and idempotent. The existing single-column FK
-- questions.topic_id -> topics(id) is left in place (harmless and still enforces
-- topic existence + ON DELETE CASCADE).

-- Drop the FK first so the unique index it depends on can be recreated on re-run.
alter table public.questions drop constraint if exists questions_topic_grade_fk;

-- Unique target for the composite FK (id is PK, so (id, grade) is trivially unique).
alter table public.topics drop constraint if exists topics_id_grade_key;
alter table public.topics add constraint topics_id_grade_key unique (id, grade);

-- Composite FK: a question's (topic_id, grade) must exist as a topic's (id, grade).
alter table public.questions
  add constraint questions_topic_grade_fk
  foreign key (topic_id, grade) references public.topics (id, grade) on delete cascade;

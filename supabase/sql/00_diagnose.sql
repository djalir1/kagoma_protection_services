-- ============================================================
-- KAGOMA — Diagnostic
-- Paste into Supabase -> SQL Editor and run. Nothing is changed.
-- Work down the checks in order; the first one that looks wrong
-- is the one to fix.
-- ============================================================

-- 1. Which migrations have landed? (tables that should exist)
select 'courses'        as object, count(*) as rows from public.courses
union all select 'modules',              count(*) from public.modules
union all select 'lessons',              count(*) from public.lessons
union all select 'assessments',          count(*) from public.assessments
union all select 'questions',            count(*) from public.questions
union all select 'question_options',     count(*) from public.question_options
union all select 'enrollments',          count(*) from public.enrollments
union all select 'certificates',         count(*) from public.certificates
order by 1;
-- EXPECTED after 01..14:
--   courses 20 · modules 103 · lessons 551 · assessments 116 · questions 389
--   If courses = 9  -> migration 05 has not been run.
--   If modules = 0  -> migration 11 has not been run, or it failed.


-- 2. Content per course — find the empty ones
select c.id,
       c.title,
       (select count(*) from public.modules m where m.course_id = c.id)     as modules,
       (select count(*) from public.lessons l
          join public.modules m on m.id = l.module_id
         where m.course_id = c.id)                                          as lessons,
       (select count(*) from public.assessments a where a.course_id = c.id) as assessments
from public.courses c
order by modules asc, c.id;
-- Any course showing 0 modules will tell the learner
-- "this course has no content loaded yet".


-- 3. Is the course the learner enrolled on actually in the catalogue?
select e.course_id,
       (c.id is not null) as course_exists,
       count(*)           as enrolments
from public.enrollments e
left join public.courses c on c.id = e.course_id
group by e.course_id, c.id
order by e.course_id;
-- course_exists = false means the enrolment points at a course id
-- that no longer exists — migration 05 renames nothing, so this
-- should not happen, but it is worth ruling out.


-- 4. Migration 05 sanity: the full catalogue
select track, count(*) from public.courses group by track order by track;
-- EXPECTED: core = 12, ep = 8

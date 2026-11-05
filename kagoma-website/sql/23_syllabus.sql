-- ============================================================
-- KAGOMA — Migration 21: Syllabus, outcomes, and practice
--
-- Modelled on the way Saylor Academy structures a course:
--
--   Syllabus  ->  Units with stated outcomes  ->  Lessons with a
--   note on what to focus on  ->  End-of-unit practice (ungraded,
--   unlimited)  ->  Final exam (the only thing that is graded)
--
-- The change that matters most is the middle one. Until now a unit
-- quiz was graded and its attempts were counted, which teaches a
-- learner to protect their score instead of finding out what they
-- do not know. Practice should be free to fail.
--
-- Run AFTER 01..22. Safe to re-run.
-- ============================================================

-- ---------- 1. The course, described properly ----------
alter table public.courses add column if not exists overview      text;
alter table public.courses add column if not exists overview_rw   text;
alter table public.courses add column if not exists outcomes      jsonb default '[]'::jsonb;
alter table public.courses add column if not exists outcomes_rw   jsonb default '[]'::jsonb;
alter table public.courses add column if not exists requirements  text;
alter table public.courses add column if not exists requirements_rw text;
alter table public.courses add column if not exists study_hours   numeric(6,1);
alter table public.courses add column if not exists self_paced    boolean not null default true;

comment on column public.courses.study_hours is
  'Guided study hours. Printed on the certificate, so it must be honest.';


-- ---------- 2. Units state what they are for ----------
alter table public.modules add column if not exists outcomes    jsonb default '[]'::jsonb;
alter table public.modules add column if not exists outcomes_rw jsonb default '[]'::jsonb;
alter table public.modules add column if not exists study_hours numeric(5,1);


-- ---------- 3. Lessons say what to focus on ----------
alter table public.lessons add column if not exists focus_note    text;
alter table public.lessons add column if not exists focus_note_rw text;
alter table public.lessons add column if not exists source_title  text;
alter table public.lessons add column if not exists source_url    text;
alter table public.lessons add column if not exists licence       text;

comment on column public.lessons.focus_note is
  'What the learner should take from this lesson. Saylor puts a note like this beside every resource.';


-- ---------- 4. Practice stops being graded ----------
alter table public.assessments drop constraint if exists assessments_kind_check;
alter table public.assessments add constraint assessments_kind_check
  check (kind in ('quiz','practice','final'));

alter table public.assessments add column if not exists graded boolean not null default true;
alter table public.assessments add column if not exists instructions text;
alter table public.assessments add column if not exists instructions_rw text;

-- End-of-unit assessments become ungraded practice with no attempt limit.
update public.assessments
   set graded = false, max_attempts = null
 where kind = 'quiz';

-- The final exam stays graded and keeps its limit.
update public.assessments set graded = true where kind = 'final';

comment on column public.assessments.graded is
  'Only the final exam counts towards completion. Practice exists to be failed safely.';


-- ---------- 5. Give every course a starting syllabus ----------
update public.courses c set
  study_hours = coalesce(c.study_hours,
    (select round(coalesce(sum(l.duration_minutes),0)/60.0, 1)
       from public.lessons l join public.modules m on m.id = l.module_id
      where m.course_id = c.id)),
  overview = coalesce(c.overview, c.description),
  overview_rw = coalesce(c.overview_rw, c.description_rw),
  requirements = coalesce(c.requirements,
    'A device with internet access. Every lesson, the practice questions and the final exam are online.'),
  requirements_rw = coalesce(c.requirements_rw,
    'Igikoresho gifite interineti. Amasomo yose, ibibazo byo kwitoza n''ikizamini cya nyuma biri kuri interineti.')
where true;


-- ---------- 6. Everything the syllabus page needs, in one call ----------
create or replace function public.course_syllabus(p_course text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'id', c.id, 'title', c.title, 'title_rw', c.title_rw,
    'overview', c.overview, 'overview_rw', c.overview_rw,
    'outcomes', c.outcomes, 'outcomes_rw', c.outcomes_rw,
    'requirements', c.requirements, 'requirements_rw', c.requirements_rw,
    'study_hours', c.study_hours, 'self_paced', c.self_paced,
    'practical', c.practical, 'fee_rwf', c.fee_rwf,
    'min_age', c.min_age,
    'spec', c.spec_en, 'spec_rw', c.spec_rw,
    'pass_mark', coalesce((select pass_mark from public.assessments
                            where course_id = c.id and kind = 'final' limit 1), 70),
    'final_attempts', (select max_attempts from public.assessments
                        where course_id = c.id and kind = 'final' limit 1),
    'prerequisites', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.requires_course_id, 'title', rc.title))
      from public.course_prerequisites p
      join public.courses rc on rc.id = p.requires_course_id
      where p.course_id = c.id), '[]'::jsonb),
    'units', coalesce((
      select jsonb_agg(jsonb_build_object(
        'number', m.number, 'title', m.title, 'title_rw', m.title_rw,
        'intro', m.intro, 'intro_rw', m.intro_rw,
        'outcomes', m.outcomes, 'outcomes_rw', m.outcomes_rw,
        'lessons', (select count(*) from public.lessons l where l.module_id = m.id),
        'hours', m.study_hours
      ) order by m.sort_order)
      from public.modules m where m.course_id = c.id), '[]'::jsonb)
  ) into v
  from public.courses c where c.id = p_course;
  return v;
end; $$;
grant execute on function public.course_syllabus(text) to anon, authenticated;


-- ---------- 7. Every learning material in one list ----------
create or replace function public.course_resources(p_course text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'unit', m.number, 'unit_title', m.title,
    'number', l.number, 'title', l.title, 'title_rw', l.title_rw,
    'kind', l.kind, 'minutes', l.duration_minutes,
    'focus', l.focus_note, 'focus_rw', l.focus_note_rw,
    'source', l.source_title, 'url', l.source_url, 'licence', l.licence
  ) order by m.sort_order, l.sort_order), '[]'::jsonb)
  from public.lessons l join public.modules m on m.id = l.module_id
  where m.course_id = p_course;
$$;
grant execute on function public.course_resources(text) to authenticated;


-- ---------- 8. Sanity checks ----------
-- select public.course_syllabus('KG-108');
-- select kind, graded, count(*) from public.assessments group by kind, graded;

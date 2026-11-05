-- ============================================================
-- KAGOMA — Migration 6: Learning platform + Assessment engine
--
--   COURSE -> Module -> Lesson (video / pdf / text) -> Quiz
--                                   |
--                            Final Assessment
--                                   |
--                              CERTIFICATE
--
-- Run AFTER 01, 04, 05, 06, 07. Safe to re-run.
-- ============================================================

-- ---------- 1. MODULES ----------
create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  number int not null,
  title text not null,
  title_rw text,
  intro text,
  intro_rw text,
  sort_order int not null default 0,
  unique (course_id, number)
);
create index if not exists modules_course_idx on public.modules(course_id, sort_order);
alter table public.modules enable row level security;

drop policy if exists "modules_read" on public.modules;
create policy "modules_read" on public.modules
  for select using (auth.uid() is not null);
drop policy if exists "modules_admin" on public.modules;
create policy "modules_admin" on public.modules
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 2. LESSONS ----------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  number text not null,                     -- '1.1', '1.2'
  title text not null,
  title_rw text,
  kind text not null default 'text'
    check (kind in ('text','video','pdf')),
  body text,                                -- text lesson content
  body_rw text,
  media_url text,                           -- video or document URL
  duration_minutes int,
  sort_order int not null default 0
);
create index if not exists lessons_module_idx on public.lessons(module_id, sort_order);
alter table public.lessons enable row level security;

-- A lesson is readable by a learner enrolled on its course (or by staff).
drop policy if exists "lessons_read" on public.lessons;
create policy "lessons_read" on public.lessons
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.modules m
      join public.enrollments e on e.course_id = m.course_id
      where m.id = module_id and e.student_id = auth.uid()
    )
  );
drop policy if exists "lessons_admin" on public.lessons;
create policy "lessons_admin" on public.lessons
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 3. LESSON PROGRESS (resume where you left off) ----------
create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  seconds_watched int not null default 0,
  last_seen_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);
create index if not exists lesson_prog_student_idx on public.lesson_progress(student_id);
alter table public.lesson_progress enable row level security;

drop policy if exists "lesson_prog_own" on public.lesson_progress;
create policy "lesson_prog_own" on public.lesson_progress
  for all using (auth.uid() = student_id or public.is_admin())
  with check (auth.uid() = student_id);


-- ---------- 4. ASSESSMENTS (module quiz or final exam) ----------
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id text not null references public.courses(id) on delete cascade,
  module_id uuid references public.modules(id) on delete cascade,   -- null = final exam
  title text not null,
  title_rw text,
  kind text not null default 'quiz' check (kind in ('quiz','final')),
  pass_mark int not null default 70 check (pass_mark between 1 and 100),
  max_attempts int,                          -- null = unlimited
  time_limit_minutes int,
  sort_order int not null default 0
);
create index if not exists assessments_course_idx on public.assessments(course_id, sort_order);
alter table public.assessments enable row level security;

drop policy if exists "assessments_read" on public.assessments;
create policy "assessments_read" on public.assessments
  for select using (
    public.is_admin()
    or exists (select 1 from public.enrollments e
               where e.course_id = assessments.course_id and e.student_id = auth.uid())
  );
drop policy if exists "assessments_admin" on public.assessments;
create policy "assessments_admin" on public.assessments
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 5. QUESTIONS ----------
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  number int not null,
  kind text not null default 'mcq'
    check (kind in ('mcq','true_false','scenario')),
  prompt text not null,
  prompt_rw text,
  scenario text,                             -- background text for scenario questions
  scenario_rw text,
  explanation text,                          -- shown after the attempt
  explanation_rw text,
  points int not null default 1 check (points > 0),
  sort_order int not null default 0
);
create index if not exists questions_assessment_idx on public.questions(assessment_id, sort_order);
alter table public.questions enable row level security;

drop policy if exists "questions_read" on public.questions;
create policy "questions_read" on public.questions
  for select using (
    public.is_admin()
    or exists (select 1 from public.assessments a
               join public.enrollments e on e.course_id = a.course_id
               where a.id = assessment_id and e.student_id = auth.uid())
  );
drop policy if exists "questions_admin" on public.questions;
create policy "questions_admin" on public.questions
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 6. OPTIONS ----------
-- NOTE: is_correct is deliberately NOT readable by learners.
create table if not exists public.question_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  label text not null,
  label_rw text,
  is_correct boolean not null default false,
  sort_order int not null default 0
);
create index if not exists options_question_idx on public.question_options(question_id, sort_order);
alter table public.question_options enable row level security;

-- Only staff read the option rows directly; learners receive options through
-- the get_assessment() function below, which strips the answer key.
drop policy if exists "options_admin" on public.question_options;
create policy "options_admin" on public.question_options
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 7. ATTEMPTS ----------
create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  attempt_no int not null default 1,
  score_pct int,
  passed boolean,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  answers jsonb,                             -- { question_id: option_id }
  unique (assessment_id, student_id, attempt_no)
);
create index if not exists attempts_student_idx on public.assessment_attempts(student_id);
alter table public.assessment_attempts enable row level security;

drop policy if exists "attempts_own" on public.assessment_attempts;
create policy "attempts_own" on public.assessment_attempts
  for select using (auth.uid() = student_id or public.is_admin());
-- Attempts are written only through submit_assessment(); no direct insert.


-- ---------- 8. Deliver an assessment WITHOUT the answer key ----------
create or replace function public.get_assessment(p_assessment uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course text;
  v_result jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select course_id into v_course from public.assessments where id = p_assessment;
  if v_course is null then raise exception 'No such assessment'; end if;

  if not exists (select 1 from public.enrollments
                 where course_id = v_course and student_id = auth.uid())
     and not public.is_admin() then
    raise exception 'Not enrolled on this course';
  end if;

  select jsonb_build_object(
    'id', a.id, 'title', a.title, 'title_rw', a.title_rw,
    'kind', a.kind, 'pass_mark', a.pass_mark,
    'time_limit_minutes', a.time_limit_minutes,
    'questions', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', q.id, 'number', q.number, 'kind', q.kind,
        'prompt', q.prompt, 'prompt_rw', q.prompt_rw,
        'scenario', q.scenario, 'scenario_rw', q.scenario_rw,
        'options', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', o.id, 'label', o.label, 'label_rw', o.label_rw
          ) order by o.sort_order)
          from public.question_options o where o.question_id = q.id
        ), '[]'::jsonb)
      ) order by q.sort_order)
      from public.questions q where q.assessment_id = a.id
    ), '[]'::jsonb)
  ) into v_result
  from public.assessments a where a.id = p_assessment;

  return v_result;
end;
$$;
revoke all on function public.get_assessment(uuid) from public;
grant execute on function public.get_assessment(uuid) to authenticated;


-- ---------- 9. Score an attempt server-side ----------
create or replace function public.submit_assessment(p_assessment uuid, p_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course text; v_pass int; v_max int;
  v_attempt_no int; v_total int := 0; v_earned int := 0;
  v_pct int; v_passed boolean; v_attempt uuid;
  r record;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select course_id, pass_mark, max_attempts
    into v_course, v_pass, v_max
  from public.assessments where id = p_assessment;
  if v_course is null then raise exception 'No such assessment'; end if;

  if not exists (select 1 from public.enrollments
                 where course_id = v_course and student_id = auth.uid()) then
    raise exception 'Not enrolled on this course';
  end if;

  select coalesce(max(attempt_no),0)+1 into v_attempt_no
  from public.assessment_attempts
  where assessment_id = p_assessment and student_id = auth.uid();

  if v_max is not null and v_attempt_no > v_max then
    raise exception 'No attempts remaining';
  end if;

  -- score
  for r in
    select q.id, q.points,
           (select o.id from public.question_options o
             where o.question_id = q.id and o.is_correct limit 1) as correct_option
    from public.questions q where q.assessment_id = p_assessment
  loop
    v_total := v_total + r.points;
    if r.correct_option is not null
       and (p_answers ->> r.id::text) = r.correct_option::text then
      v_earned := v_earned + r.points;
    end if;
  end loop;

  v_pct    := case when v_total = 0 then 0 else round(v_earned::numeric * 100 / v_total) end;
  v_passed := v_pct >= v_pass;

  insert into public.assessment_attempts
    (assessment_id, student_id, attempt_no, score_pct, passed, submitted_at, answers)
  values (p_assessment, auth.uid(), v_attempt_no, v_pct, v_passed, now(), p_answers)
  returning id into v_attempt;

  return jsonb_build_object(
    'attempt_id', v_attempt, 'attempt_no', v_attempt_no,
    'score_pct', v_pct, 'passed', v_passed, 'pass_mark', v_pass
  );
end;
$$;
revoke all on function public.submit_assessment(uuid, jsonb) from public;
grant execute on function public.submit_assessment(uuid, jsonb) to authenticated;


-- ---------- 10. Course progress (drives the progress bars) ----------
create or replace function public.course_progress(p_course text, p_student uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_student uuid := coalesce(p_student, auth.uid());
  v_modules jsonb; v_overall int;
begin
  if v_student is null then raise exception 'Not signed in'; end if;
  if v_student <> auth.uid() and not public.is_admin() then
    raise exception 'Not permitted';
  end if;

  select coalesce(jsonb_agg(x order by x->>'number'), '[]'::jsonb) into v_modules
  from (
    select jsonb_build_object(
      'module_id', m.id, 'number', m.number, 'title', m.title, 'title_rw', m.title_rw,
      'lessons_total', t.total,
      'lessons_done',  t.done,
      'pct', case when t.total = 0 then 0 else round(t.done::numeric*100/t.total) end
    ) as x, m.number
    from public.modules m
    cross join lateral (
      select count(l.id) as total,
             count(lp.id) filter (where lp.completed) as done
      from public.lessons l
      left join public.lesson_progress lp
        on lp.lesson_id = l.id and lp.student_id = v_student
      where l.module_id = m.id
    ) t
    where m.course_id = p_course
  ) s;

  select case when count(l.id) = 0 then 0
              else round(count(lp.id) filter (where lp.completed)::numeric*100/count(l.id)) end
    into v_overall
  from public.modules m
  join public.lessons l on l.module_id = m.id
  left join public.lesson_progress lp on lp.lesson_id = l.id and lp.student_id = v_student
  where m.course_id = p_course;

  return jsonb_build_object('course_id', p_course, 'overall_pct', coalesce(v_overall,0),
                            'modules', v_modules);
end;
$$;
revoke all on function public.course_progress(text, uuid) from public;
grant execute on function public.course_progress(text, uuid) to authenticated;

-- Keep enrollments.progress in step so existing screens stay correct.
create or replace function public.sync_enrollment_progress()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_course text; v_pct int;
begin
  select m.course_id into v_course
  from public.lessons l join public.modules m on m.id = l.module_id
  where l.id = new.lesson_id;

  select case when count(l.id) = 0 then 0
              else round(count(lp.id) filter (where lp.completed)::numeric*100/count(l.id)) end
    into v_pct
  from public.modules m
  join public.lessons l on l.module_id = m.id
  left join public.lesson_progress lp on lp.lesson_id = l.id and lp.student_id = new.student_id
  where m.course_id = v_course;

  update public.enrollments
     set progress = coalesce(v_pct,0),
         status = case when coalesce(v_pct,0) >= 100 then 'completed'
                       when coalesce(v_pct,0) > 0 then 'in_progress'
                       else status end
   where student_id = new.student_id and course_id = v_course;
  return new;
end; $$;

drop trigger if exists trg_sync_progress on public.lesson_progress;
create trigger trg_sync_progress
after insert or update on public.lesson_progress
for each row execute function public.sync_enrollment_progress();

-- ---------- Sanity checks ----------
-- select count(*) from public.modules;
-- select public.course_progress('KG-101');

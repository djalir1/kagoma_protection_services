-- ============================================================
-- KAGOMA — Migration 40: A way to correct the Kinyarwanda
--
-- The Rwanda National Police read the programme and said the English
-- is well prepared but the Kinyarwanda carries words that do not read
-- clearly. They are right. I wrote that Kinyarwanda and I am not a
-- Rwandan; guessing at it a second time would not be better than the
-- first.
--
-- So rather than rewrite it blind, this gives a Kinyarwanda speaker a
-- way to work: every line of Kinyarwanda in one place, next to its
-- English, with a column to write the correction in. Corrections are
-- then applied in one pass.
--
-- Run AFTER 01..41. Safe to re-run.
-- ============================================================

create table if not exists public.rw_review (
  id uuid primary key default gen_random_uuid(),
  source_table text not null,
  source_id    text not null,        -- a uuid for most tables, 'KG-101' for a course
  source_column text not null,
  context      text,                    -- which course and module it sits in
  english      text,
  kinyarwanda  text,
  corrected    text,                    -- the reviewer writes here
  note         text,                    -- and why, if it helps
  status       text not null default 'pending'
    check (status in ('pending','ok','corrected','applied')),
  reviewed_by  text,
  reviewed_on  timestamptz,
  created_at   timestamptz not null default now(),
  unique (source_table, source_id, source_column)
);
create index if not exists rw_review_status_idx on public.rw_review(status, source_table);

alter table public.rw_review enable row level security;
drop policy if exists "rwrev_staff" on public.rw_review;
create policy "rwrev_staff" on public.rw_review
  for all using (public.is_staff()) with check (public.is_staff());


-- ---------- 1. Collect everything that needs reading ----------
create or replace function public.build_rw_review()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int; total int := 0;
begin
  if not public.is_admin() then raise exception 'Only an administrator'; end if;

  -- courses
  insert into public.rw_review (source_table, source_id, source_column, context, english, kinyarwanda)
  select 'courses', c.id, 'title_rw', c.id, c.title, c.title_rw
  from public.courses c where c.title_rw is not null
  on conflict do nothing;

  -- modules
  insert into public.rw_review (source_table, source_id, source_column, context, english, kinyarwanda)
  select 'modules', m.id::text, 'title_rw', m.course_id || ' · module ' || m.number, m.title, m.title_rw
  from public.modules m where m.title_rw is not null
  on conflict do nothing;

  insert into public.rw_review (source_table, source_id, source_column, context, english, kinyarwanda)
  select 'modules', m.id::text, 'intro_rw', m.course_id || ' · module ' || m.number, m.intro, m.intro_rw
  from public.modules m where m.intro_rw is not null
  on conflict do nothing;

  -- lessons
  insert into public.rw_review (source_table, source_id, source_column, context, english, kinyarwanda)
  select 'lessons', l.id::text, 'title_rw',
         m.course_id || ' · module ' || m.number || ' · lesson ' || l.number, l.title, l.title_rw
  from public.lessons l join public.modules m on m.id = l.module_id
  where l.title_rw is not null
  on conflict do nothing;

  insert into public.rw_review (source_table, source_id, source_column, context, english, kinyarwanda)
  select 'lessons', l.id::text, 'body_rw',
         m.course_id || ' · module ' || m.number || ' · lesson ' || l.number, l.body, l.body_rw
  from public.lessons l join public.modules m on m.id = l.module_id
  where l.body_rw is not null
  on conflict do nothing;

  -- questions and their options
  insert into public.rw_review (source_table, source_id, source_column, context, english, kinyarwanda)
  select 'questions', q.id::text, 'prompt_rw', a.course_id || ' · ' || a.kind, q.prompt, q.prompt_rw
  from public.questions q join public.assessments a on a.id = q.assessment_id
  where q.prompt_rw is not null
  on conflict do nothing;

  insert into public.rw_review (source_table, source_id, source_column, context, english, kinyarwanda)
  select 'question_options', o.id::text, 'label_rw', a.course_id || ' · answer', o.label, o.label_rw
  from public.question_options o
  join public.questions q on q.id = o.question_id
  join public.assessments a on a.id = q.assessment_id
  where o.label_rw is not null
  on conflict do nothing;

  select count(*) into total from public.rw_review;
  select count(*) into n from public.rw_review where status = 'pending';

  return jsonb_build_object('total', total, 'pending', n);
end; $$;
revoke all on function public.build_rw_review() from public;
grant execute on function public.build_rw_review() to authenticated;


-- ---------- 2. Put the corrections back ----------
create or replace function public.apply_rw_corrections()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare r record; n int := 0;
begin
  if not public.is_admin() then raise exception 'Only an administrator'; end if;

  for r in select * from public.rw_review
            where status = 'corrected'
              and corrected is not null
              and btrim(corrected) <> ''
  loop
    -- each table is named explicitly: a correction must never be able
    -- to reach a column nobody asked it to touch
    if    r.source_table='courses'          and r.source_column='title_rw'  then
      update public.courses set title_rw = r.corrected where id = r.source_id;
    elsif r.source_table='modules'          and r.source_column='title_rw'  then
      update public.modules set title_rw = r.corrected where id = r.source_id::uuid;
    elsif r.source_table='modules'          and r.source_column='intro_rw'  then
      update public.modules set intro_rw = r.corrected where id = r.source_id::uuid;
    elsif r.source_table='lessons'          and r.source_column='title_rw'  then
      update public.lessons set title_rw = r.corrected where id = r.source_id::uuid;
    elsif r.source_table='lessons'          and r.source_column='body_rw'   then
      update public.lessons set body_rw = r.corrected where id = r.source_id::uuid;
    elsif r.source_table='questions'        and r.source_column='prompt_rw' then
      update public.questions set prompt_rw = r.corrected where id = r.source_id::uuid;
    elsif r.source_table='question_options' and r.source_column='label_rw'  then
      update public.question_options set label_rw = r.corrected where id = r.source_id::uuid;
    else
      continue;
    end if;

    update public.rw_review
       set status = 'applied', reviewed_on = coalesce(reviewed_on, now())
     where id = r.id;
    n := n + 1;
  end loop;

  return jsonb_build_object('applied', n);
end; $$;
revoke all on function public.apply_rw_corrections() from public;
grant execute on function public.apply_rw_corrections() to authenticated;


-- ---------- 3. Where the review stands ----------
create or replace function public.rw_review_progress()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  return (select jsonb_object_agg(status, n)
            from (select status, count(*) as n from public.rw_review group by status) x);
end; $$;
grant execute on function public.rw_review_progress() to authenticated;

-- ---------- How to use it ----------
-- 1.  select public.build_rw_review();
-- 2.  Table Editor -> rw_review -> export to CSV, or work in the table
--     directly. For each row: read "english" and "kinyarwanda".
--       · reads well      -> status = 'ok'
--       · needs changing  -> write the better wording in "corrected",
--                            set status = 'corrected'
-- 3.  select public.apply_rw_corrections();
-- 4.  select public.rw_review_progress();

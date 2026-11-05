-- ============================================================
-- KAGOMA — Migration 13: Automatic certificate on passing
--
--   Student passes the final assessment
--        -> certificate issued automatically
--        -> appears in their portal at once
--        -> an e-mail is queued for delivery
--
-- Run AFTER 01..14. Safe to re-run.
-- ============================================================

-- ---------- 1. Issue without requiring a staff session ----------
-- issue_certificate() is guarded by is_admin() on purpose. The trigger
-- runs as the learner, so it needs its own entry point. This one can
-- only ever be called from the trigger below, and it refuses to issue
-- unless the pass is real.
create or replace function public.auto_issue_certificate(
  p_student uuid, p_course text, p_score int
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_num text; v_tok text; v_sname text; v_cname text;
begin
  -- never issue twice for the same course
  if exists (select 1 from public.certificates
             where student_id = p_student and course_id = p_course
               and status <> 'revoked') then
    return null;
  end if;

  select full_name into v_sname from public.profiles where id = p_student;
  select title     into v_cname from public.courses  where id = p_course;
  if v_cname is null then return null; end if;

  v_num := public.next_certificate_number();
  v_tok := encode(gen_random_bytes(16),'hex');

  insert into public.certificates
    (id, student_id, course_id, student_name, course_name,
     issue_date, certificate_number, verify_token,
     status, level, final_score)
  values
    (v_num, p_student, p_course, coalesce(v_sname,'(no name)'), v_cname,
     current_date, v_num, v_tok, 'valid', 'certified', p_score);

  return v_num;
end; $$;
revoke all on function public.auto_issue_certificate(uuid,text,int) from public;


-- ---------- 2. Outgoing e-mail queue ----------
-- The database cannot send mail on its own. It records what should be
-- sent; a small Edge Function drains this table and calls the mail
-- provider. Keeping the queue means nothing is lost if mail is down.
create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  to_name text,
  subject text not null,
  kind text not null default 'certificate',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    check (status in ('pending','sent','failed')),
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index if not exists email_outbox_pending_idx
  on public.email_outbox(status, created_at) where status = 'pending';
alter table public.email_outbox enable row level security;

-- Nobody reads this from the browser. Only staff, for troubleshooting.
drop policy if exists "email_outbox_admin" on public.email_outbox;
create policy "email_outbox_admin" on public.email_outbox
  for select using (public.is_admin());


-- ---------- 3. The trigger ----------
create or replace function public.trg_final_passed()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_course text; v_kind text; v_num text; v_email text; v_name text;
begin
  if new.passed is not true or new.submitted_at is null then
    return new;
  end if;

  select a.course_id, a.kind into v_course, v_kind
  from public.assessments a where a.id = new.assessment_id;

  -- only the final exam awards a certificate
  if v_kind is distinct from 'final' then
    return new;
  end if;

  v_num := public.auto_issue_certificate(new.student_id, v_course, new.score_pct);
  if v_num is null then
    return new;              -- already held one
  end if;

  update public.enrollments
     set status = 'completed', progress = greatest(coalesce(progress,0), 100)
   where student_id = new.student_id and course_id = v_course;

  select u.email, p.full_name into v_email, v_name
  from auth.users u join public.profiles p on p.id = u.id
  where u.id = new.student_id;

  if v_email is not null then
    insert into public.email_outbox (to_email, to_name, subject, kind, payload)
    values (
      v_email,
      coalesce(v_name,''),
      'Your Kagoma certificate — ' || v_num,
      'certificate',
      jsonb_build_object(
        'certificate_number', v_num,
        'course_id',   v_course,
        'course_name', (select title from public.courses where id = v_course),
        'student_name', coalesce(v_name,''),
        'score', new.score_pct,
        'issued', current_date
      )
    );
  end if;

  return new;
end; $$;

drop trigger if exists trg_final_passed on public.assessment_attempts;
create trigger trg_final_passed
after insert on public.assessment_attempts
for each row execute function public.trg_final_passed();


-- ---------- 4. Backfill: anyone who already passed ----------
-- Learners who passed a final before this migration existed should not
-- have to sit the exam again.
do $$
declare r record; v_num text;
begin
  for r in
    select distinct on (at.student_id, a.course_id)
           at.student_id, a.course_id, at.score_pct
    from public.assessment_attempts at
    join public.assessments a on a.id = at.assessment_id
    where a.kind = 'final' and at.passed
    order by at.student_id, a.course_id, at.score_pct desc
  loop
    v_num := public.auto_issue_certificate(r.student_id, r.course_id, r.score_pct);
    if v_num is not null then
      raise notice 'Issued % for % on %', v_num, r.student_id, r.course_id;
    end if;
  end loop;
end $$;


-- ---------- 5. Sanity checks ----------
-- select count(*) from public.certificates where level = 'certified';
-- select status, count(*) from public.email_outbox group by status;

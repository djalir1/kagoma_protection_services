-- ============================================================
-- KAGOMA — Migration 23: Free to learn, paid to be certified
--
--   Study free  ->  pass the final exam  ->  certificate is earned
--   ->  pay the certificate fee  ->  certificate is issued
--
-- Passing is what earns it; the fee is what releases the document.
-- A learner who never pays keeps everything they learned and their
-- exam result, and can pay later — nothing expires.
--
-- Run AFTER 01..24. Safe to re-run.
-- ============================================================

-- ---------- 1. What a certificate costs ----------
alter table public.courses add column if not exists certificate_fee_rwf numeric(12,2);

comment on column public.courses.certificate_fee_rwf is
  'What the learner pays to be issued the certificate. NULL or 0 means the
   certificate is issued automatically on passing.';

-- A starting price. Change it per course as you see fit.
update public.courses set certificate_fee_rwf = 25000 where track = 'core';
update public.courses set certificate_fee_rwf = 15000 where track = 'ep';


-- ---------- 2. A payment now says what it is for ----------
alter table public.payments add column if not exists purpose text
  not null default 'course' check (purpose in ('course','certificate','practical','other'));

create index if not exists payments_purpose_idx on public.payments(purpose, student_id);


-- ---------- 3. Passing no longer issues by itself ----------
-- Migration 15 issued the certificate the moment the final exam was
-- passed. With a fee in place that would give it away, so the trigger
-- now issues only where the course is free to certify.
create or replace function public.trg_final_passed()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_course text; v_kind text; v_num text; v_email text; v_name text; v_fee numeric;
begin
  if new.passed is not true or new.submitted_at is null then
    return new;
  end if;

  select a.course_id, a.kind into v_course, v_kind
  from public.assessments a where a.id = new.assessment_id;
  if v_kind is distinct from 'final' then return new; end if;

  update public.enrollments
     set status = 'completed', progress = greatest(coalesce(progress,0), 100)
   where student_id = new.student_id and course_id = v_course;

  select certificate_fee_rwf into v_fee from public.courses where id = v_course;

  -- a fee to pay means the learner claims it themselves
  if coalesce(v_fee, 0) > 0 then
    return new;
  end if;

  v_num := public.auto_issue_certificate(new.student_id, v_course, new.score_pct);
  if v_num is null then return new; end if;

  select u.email, p.full_name into v_email, v_name
  from auth.users u join public.profiles p on p.id = u.id
  where u.id = new.student_id;

  if v_email is not null then
    insert into public.email_outbox (to_email, to_name, subject, kind, payload)
    values (v_email, coalesce(v_name,''),
      'Your Kagoma certificate — ' || v_num, 'certificate',
      jsonb_build_object('certificate_number', v_num, 'course_id', v_course,
        'course_name', (select title from public.courses where id = v_course),
        'student_name', coalesce(v_name,''), 'score', new.score_pct, 'issued', current_date));
  end if;

  return new;
end; $$;


-- ---------- 4. Paying for a certificate issues it ----------
create or replace function public.trg_certificate_paid()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_best int; v_num text; v_fee numeric; v_paid numeric; v_email text; v_name text;
begin
  if new.purpose <> 'certificate' or new.status <> 'confirmed' then return new; end if;
  if tg_op = 'UPDATE' and old.status = 'confirmed' then return new; end if;

  select certificate_fee_rwf into v_fee from public.courses where id = new.course_id;

  select coalesce(sum(amount_rwf),0) into v_paid from public.payments
   where student_id = new.student_id and course_id = new.course_id
     and purpose = 'certificate' and status = 'confirmed';

  if v_paid < coalesce(v_fee,0) then return new; end if;   -- part paid, not yet

  select max(at.score_pct) into v_best
  from public.assessment_attempts at
  join public.assessments a on a.id = at.assessment_id
  where at.student_id = new.student_id and a.course_id = new.course_id
    and a.kind = 'final' and at.passed;
  if v_best is null then return new; end if;               -- exam not passed

  v_num := public.auto_issue_certificate(new.student_id, new.course_id, v_best);
  if v_num is null then return new; end if;

  select u.email, p.full_name into v_email, v_name
  from auth.users u join public.profiles p on p.id = u.id
  where u.id = new.student_id;

  if v_email is not null then
    insert into public.email_outbox (to_email, to_name, subject, kind, payload)
    values (v_email, coalesce(v_name,''),
      'Your Kagoma certificate — ' || v_num, 'certificate',
      jsonb_build_object('certificate_number', v_num, 'course_id', new.course_id,
        'course_name', (select title from public.courses where id = new.course_id),
        'student_name', coalesce(v_name,''), 'score', v_best, 'issued', current_date));
  end if;

  return new;
end; $$;

drop trigger if exists trg_certificate_paid on public.payments;
create trigger trg_certificate_paid
after insert or update on public.payments
for each row execute function public.trg_certificate_paid();


-- ---------- 5. What the learner has earned but not yet claimed ----------
create or replace function public.my_certificate_claims()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  return coalesce((
    select jsonb_agg(x order by x->>'course_id')
    from (
      select jsonb_build_object(
        'course_id', c.id,
        'course', c.title, 'course_rw', c.title_rw,
        'score', b.best,
        'fee', coalesce(c.certificate_fee_rwf, 0),
        'paid', coalesce((select sum(amount_rwf) from public.payments
                          where student_id = auth.uid() and course_id = c.id
                            and purpose = 'certificate' and status = 'confirmed'), 0),
        'pending', coalesce((select sum(amount_rwf) from public.payments
                          where student_id = auth.uid() and course_id = c.id
                            and purpose = 'certificate' and status = 'pending'), 0),
        'issued', exists (select 1 from public.certificates
                          where student_id = auth.uid() and course_id = c.id
                            and status <> 'revoked'),
        'blocked', public.eligibility(auth.uid(), c.id)
      ) as x
      from public.courses c
      cross join lateral (
        select max(at.score_pct) as best
        from public.assessment_attempts at
        join public.assessments a on a.id = at.assessment_id
        where a.course_id = c.id and a.kind = 'final'
          and at.student_id = auth.uid() and at.passed
      ) b
      where b.best is not null
    ) s
  ), '[]'::jsonb);
end; $$;
grant execute on function public.my_certificate_claims() to authenticated;


-- ---------- 6. What is still owed on a certificate ----------
create or replace function public.certificate_balance(p_student uuid, p_course text)
returns numeric
language sql stable security definer set search_path = public as $$
  select greatest(0,
    coalesce((select certificate_fee_rwf from public.courses where id = p_course), 0)
  - coalesce((select sum(amount_rwf) from public.payments
              where student_id = p_student and course_id = p_course
                and purpose = 'certificate' and status = 'confirmed'), 0));
$$;
grant execute on function public.certificate_balance(uuid,text) to authenticated;


-- ---------- 7. Claiming it ----------
-- A learner records the payment they made; Kagoma confirms it, and the
-- trigger above issues the certificate. Where the gateway is live the
-- webhook confirms instead, and the same trigger fires.
create or replace function public.submit_certificate_payment(
  p_course text, p_amount numeric, p_method text default 'momo',
  p_reference text default null, p_phone text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_elig jsonb; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  -- the record has to support a certificate before money changes hands
  v_elig := public.eligibility(auth.uid(), p_course);
  if (v_elig->>'eligible')::boolean is not true then
    return jsonb_build_object('ok', false, 'reason', 'not_eligible', 'eligibility', v_elig);
  end if;

  if not exists (
    select 1 from public.assessment_attempts at
    join public.assessments a on a.id = at.assessment_id
    where at.student_id = auth.uid() and a.course_id = p_course
      and a.kind = 'final' and at.passed) then
    return jsonb_build_object('ok', false, 'reason', 'exam_not_passed');
  end if;

  if p_reference is not null and exists (
       select 1 from public.payments where reference = btrim(p_reference)) then
    return jsonb_build_object('ok', false, 'reason', 'duplicate_reference');
  end if;

  insert into public.payments (
    student_id, course_id, amount_rwf, method, reference, payer_phone,
    status, submitted_by_student, purpose, paid_on)
  values (auth.uid(), p_course, p_amount, p_method,
    nullif(btrim(coalesce(p_reference,'')),''),
    nullif(btrim(coalesce(p_phone,'')),''),
    'pending', true, 'certificate', current_date)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end; $$;
revoke all on function public.submit_certificate_payment(text,numeric,text,text,text) from public;
grant execute on function public.submit_certificate_payment(text,numeric,text,text,text) to authenticated;


-- ---------- 8. Sanity checks ----------
-- select id, title, certificate_fee_rwf from public.courses order by sort_order;
-- select public.my_certificate_claims();

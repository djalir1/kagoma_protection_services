-- ============================================================
-- KAGOMA — Migration 41: Close two holes found in a security audit
--
-- Two functions run with the owner's rights, take a learner's id as an
-- argument, and never check who is calling:
--
--   balance_for(p_student, p_course)
--   certificate_balance(p_student, p_course)
--
-- Any signed-in account could pass somebody else's id and read what
-- that person owes and has paid. Nobody's money is any other learner's
-- business.
--
-- Both now answer only for the caller, or for staff.
--
-- Run AFTER 01..42. Safe to re-run.
-- ============================================================

create or replace function public.balance_for(p_student uuid, p_course text)
returns numeric
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_student <> auth.uid() and not public.is_staff() then
    raise exception 'You may only see your own balance';
  end if;

  return coalesce((select fee_rwf from public.courses where id = p_course), 0)
       - coalesce((select sum(amount_rwf) from public.payments
                   where student_id = p_student and course_id = p_course
                     and status = 'confirmed'), 0);
end; $$;
revoke all on function public.balance_for(uuid,text) from public;
grant execute on function public.balance_for(uuid,text) to authenticated;


create or replace function public.certificate_balance(p_student uuid, p_course text)
returns numeric
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if p_student <> auth.uid() and not public.is_staff() then
    raise exception 'You may only see your own balance';
  end if;

  return greatest(0,
    coalesce((select certificate_fee_rwf from public.courses where id = p_course), 0)
  - coalesce((select sum(amount_rwf) from public.payments
              where student_id = p_student and course_id = p_course
                and purpose = 'certificate' and status = 'confirmed'), 0));
end; $$;
revoke all on function public.certificate_balance(uuid,text) from public;
grant execute on function public.certificate_balance(uuid,text) to authenticated;


-- ---------- Eligibility answers for the caller too ----------
-- Same pattern: it takes a learner id and decides whether they may be
-- certified. Staff need it for anyone; a learner needs it for themselves.
do $$
begin
  if to_regproc('public.eligibility(uuid,text)') is not null then
    execute $fn$
      create or replace function public.eligibility(p_student uuid, p_course text)
      returns jsonb
      language plpgsql stable security definer set search_path = public as $body$
      declare v jsonb;
      begin
        if auth.uid() is null then raise exception 'Sign in first'; end if;
        if p_student <> auth.uid() and not public.is_staff() then
          raise exception 'You may only see your own eligibility';
        end if;
        select jsonb_build_object(
          'vetted', (select vetting_status = 'approved' from public.profiles where id = p_student),
          'passed', exists (select 1 from public.assessment_attempts a
                             join public.assessments s on s.id = a.assessment_id
                            where a.student_id = p_student and s.course_id = p_course
                              and s.kind = 'final' and a.passed),
          'practical_ok', public.practical_ok(p_student, p_course),
          'balance', public.certificate_balance(p_student, p_course)
        ) into v;
        return v;
      end; $body$;
    $fn$;
    revoke all on function public.eligibility(uuid,text) from public;
    grant execute on function public.eligibility(uuid,text) to authenticated;
    raise notice 'eligibility() now answers only for the caller or staff.';
  end if;
end $$;


-- ---------- What is deliberately open, and why ----------
-- These stay reachable without signing in. Each was checked:
--
--   verify_certificate   the holder's name, the course, the date. An
--                        employer must be able to check a certificate
--                        without an account. No e-mail, phone, ID,
--                        address, marks or payments.
--   course_syllabus      published course content.
--   payment_details      Kagoma's own MoMo and bank details, which are
--                        printed on every invoice anyway.
--   event_by_token       needs the event's secret token from the QR.
--   join_event           needs that same token.
--   join_work_pool       the public application form.
--   open_shifts          only events Kagoma chose to publish, and only
--                        the name, venue, date and roles.
--   offer_availability   requires the phone to already be in the pool.
--   format_address       joins five strings; touches no table.

-- Sanity check: signed in as a learner, the first must work and the
-- second must be refused.
--   select public.certificate_balance(auth.uid(), 'KG-101');
--   select public.certificate_balance('<another uuid>', 'KG-101');

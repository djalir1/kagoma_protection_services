-- ============================================================
-- KAGOMA — Migration 22: Open learning
--
-- Courses become free and enrolment becomes immediate. Anyone who
-- registers can start studying the same minute.
--
-- What stays gated is the certificate, and that is the point. The
-- vetting, the prerequisites and the practical assessment were never
-- there to keep people out of the material — they are there so the
-- certificate means something to the employer who checks it. Saylor
-- works the same way: the learning is open, the credential is earned.
--
-- Run AFTER 01..23. Safe to re-run.
-- ============================================================

-- ---------- 1. No fees ----------
update public.courses set fee_rwf = null, fee_note = null;

comment on column public.courses.fee_rwf is
  'NULL means free. The payments machinery stays in place for practical
   assessment or in-person sessions, and switches back on by setting a fee.';


-- ---------- 2. Enrolment is immediate ----------
-- Migration 19 removed self-enrolment so that vetting could not be
-- walked around. Learning is now open, so it comes back — but through
-- a function, so what is allowed stays in one place.
create or replace function public.enrol_in_course(p_course text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_role text;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('student','professional','admin') then
    return jsonb_build_object('ok', false, 'reason', 'wrong_account_type');
  end if;

  if not exists (select 1 from public.courses where id = p_course) then
    return jsonb_build_object('ok', false, 'reason', 'no_such_course');
  end if;

  if exists (select 1 from public.enrollments
             where student_id = auth.uid() and course_id = p_course) then
    return jsonb_build_object('ok', true, 'reason', 'already_enrolled');
  end if;

  insert into public.enrollments (student_id, course_id, status, progress)
  values (auth.uid(), p_course, 'in_progress', 0);

  -- an application is no longer a gate, but it keeps the record tidy
  insert into public.course_applications (student_id, course_id, status, decided_on)
  values (auth.uid(), p_course, 'approved', now())
  on conflict (student_id, course_id) do update
    set status = 'approved', decided_on = now();

  return jsonb_build_object('ok', true, 'reason', 'enrolled');
end; $$;
revoke all on function public.enrol_in_course(text) from public;
grant execute on function public.enrol_in_course(text) to authenticated;


-- ---------- 3. Prerequisites become advice, not a barrier ----------
-- Someone who wants to read the advanced material before the basic
-- course should be allowed to. It only becomes a requirement when a
-- certificate is at stake.
create or replace function public.eligibility(p_student uuid, p_course text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb := '[]'::jsonb;
  advice jsonb := '[]'::jsonb;
  v_status text; v_dob date; v_min int; v_age int;
  r record;
begin
  select vetting_status, date_of_birth into v_status, v_dob
    from public.profiles where id = p_student;
  select min_age into v_min from public.courses where id = p_course;

  -- these still block a CERTIFICATE
  if v_status is distinct from 'approved' then
    v := v || jsonb_build_array(jsonb_build_object('code','not_vetted','ok',false));
  end if;

  if v_min is not null then
    if v_dob is null then
      v := v || jsonb_build_array(jsonb_build_object('code','no_dob','ok',false,'need',v_min));
    else
      v_age := extract(year from age(current_date, v_dob));
      if v_age < v_min then
        v := v || jsonb_build_array(jsonb_build_object('code','underage','ok',false,'need',v_min,'have',v_age));
      end if;
    end if;
  end if;

  for r in select p.requires_course_id, c.title
             from public.course_prerequisites p
             join public.courses c on c.id = p.requires_course_id
            where p.course_id = p_course
  loop
    if not exists (select 1 from public.certificates
                   where student_id = p_student and course_id = r.requires_course_id
                     and status = 'valid') then
      v := v || jsonb_build_array(jsonb_build_object(
             'code','missing_prerequisite','ok',false,
             'course_id',r.requires_course_id,'course',r.title));
      advice := advice || jsonb_build_array(jsonb_build_object(
             'course_id',r.requires_course_id,'course',r.title));
    end if;
  end loop;

  return jsonb_build_object(
    'eligible', jsonb_array_length(v) = 0,   -- for the certificate
    'can_study', true,                        -- always
    'reasons', v,
    'suggested_first', advice);
end; $$;
grant execute on function public.eligibility(uuid,text) to authenticated;


-- ---------- 4. Nothing changes about the certificate ----------
-- auto_issue_certificate() already refuses when the practical is
-- missing, and issue_certificate() is staff-only. eligibility() above
-- keeps returning false until vetting, age and prerequisites are met,
-- so a learner may study everything and still not be certified until
-- the record supports it. That is the intended shape.


-- ---------- 5. Sanity checks ----------
-- select id, title, fee_rwf from public.courses order by sort_order;
-- select public.eligibility('<student-uuid>','KG-108');

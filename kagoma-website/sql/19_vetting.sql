-- ============================================================
-- KAGOMA — Migration 17: Applicants, vetting and course eligibility
--
--   Applicant -> Vetting -> Approved -> Enrolled -> Completed -> Certified
--
-- Until now anyone could open an account and enrol on anything the same
-- minute. For a security training provider that is the wrong default:
-- the certificate is only worth what the vetting behind it is worth.
--
-- Run AFTER 01..18. Safe to re-run.
-- ============================================================

-- ---------- 1. A learner record that holds together ----------
alter table public.profiles add column if not exists first_name   text;
alter table public.profiles add column if not exists last_name    text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists address_line text;
alter table public.profiles add column if not exists district     text;
alter table public.profiles add column if not exists sector       text;
alter table public.profiles add column if not exists phone        text;
alter table public.profiles add column if not exists national_id  text;

alter table public.profiles add column if not exists vetting_status text
  not null default 'pending'
  check (vetting_status in ('pending','approved','rejected','suspended'));
alter table public.profiles add column if not exists vetted_by uuid references public.profiles(id);
alter table public.profiles add column if not exists vetted_on timestamptz;
alter table public.profiles add column if not exists vetting_note text;

create index if not exists profiles_vetting_idx on public.profiles(vetting_status);
-- One person, one record. A national ID cannot be reused for a second account.
create unique index if not exists profiles_nid_uniq
  on public.profiles(national_id) where national_id is not null;

comment on column public.profiles.vetting_status is
  'pending until staff check the applicant. Nothing can be enrolled before approved.';

-- Keep full_name in step so every existing screen keeps working.
create or replace function public.sync_full_name()
returns trigger language plpgsql as $$
begin
  if new.first_name is not null or new.last_name is not null then
    new.full_name := btrim(coalesce(new.last_name,'')||' '||coalesce(new.first_name,''));
  end if;
  return new;
end; $$;
drop trigger if exists trg_sync_full_name on public.profiles;
create trigger trg_sync_full_name
before insert or update on public.profiles
for each row execute function public.sync_full_name();

-- Staff who are already using the system should not be locked out.
update public.profiles set vetting_status = 'approved'
 where role in ('admin','employer','client') and vetting_status = 'pending';
-- Nor should anyone already studying.
update public.profiles p set vetting_status = 'approved'
 where vetting_status = 'pending'
   and exists (select 1 from public.enrollments e where e.student_id = p.id);


-- ---------- 2. Carry the details through from signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare requested_role text; g text; m jsonb;
begin
  m := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  requested_role := coalesce(m->>'role', 'student');
  if requested_role not in ('student','professional','employer','client') then
    requested_role := 'student';
  end if;

  g := m->>'gender';
  if g is not null and g not in ('male','female','undisclosed') then g := null; end if;

  insert into public.profiles (
    id, full_name, first_name, last_name, date_of_birth,
    address_line, district, sector, phone,
    role, gender, country_code, country_name, vetting_status)
  values (
    new.id,
    coalesce(nullif(m->>'full_name',''),
             btrim(coalesce(m->>'last_name','')||' '||coalesce(m->>'first_name',''))),
    nullif(m->>'first_name',''),
    nullif(m->>'last_name',''),
    (nullif(m->>'date_of_birth',''))::date,
    nullif(m->>'address_line',''),
    nullif(m->>'district',''),
    nullif(m->>'sector',''),
    nullif(m->>'phone',''),
    requested_role, g,
    nullif(upper(coalesce(m->>'country_code','')),''),
    nullif(m->>'country_name',''),
    -- an organisation account is not a person to vet
    case when requested_role in ('employer','client') then 'approved' else 'pending' end
  );

  if requested_role = 'professional' then
    insert into public.professional_profiles (id) values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;


-- ---------- 3. What a course requires ----------
alter table public.courses add column if not exists min_age int;
alter table public.courses add column if not exists entry_note text;

create table if not exists public.course_prerequisites (
  course_id text not null references public.courses(id) on delete cascade,
  requires_course_id text not null references public.courses(id) on delete cascade,
  primary key (course_id, requires_course_id),
  check (course_id <> requires_course_id)
);
alter table public.course_prerequisites enable row level security;

drop policy if exists "prereq_read" on public.course_prerequisites;
create policy "prereq_read" on public.course_prerequisites
  for select using (auth.uid() is not null);
drop policy if exists "prereq_admin" on public.course_prerequisites;
create policy "prereq_admin" on public.course_prerequisites
  for all using (public.is_admin()) with check (public.is_admin());

-- Security work is adult work.
update public.courses set min_age = 18 where min_age is null;

-- The advanced and leadership courses build on the ones below them.
insert into public.course_prerequisites (course_id, requires_course_id) values
  ('KG-108','KG-109'),           -- Advanced guard follows etiquette
  ('KG-112','KG-106'),           -- CP/PSD manager follows executive protection
  ('KG-110','KG-108')            -- Risk assessment follows advanced guard
on conflict do nothing;


-- ---------- 4. Is this person eligible for this course? ----------
create or replace function public.eligibility(p_student uuid, p_course text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v jsonb := '[]'::jsonb;
  v_status text; v_dob date; v_min int; v_age int;
  r record;
begin
  select vetting_status, date_of_birth into v_status, v_dob
    from public.profiles where id = p_student;
  select min_age into v_min from public.courses where id = p_course;

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
    end if;
  end loop;

  return jsonb_build_object('eligible', jsonb_array_length(v) = 0, 'reasons', v);
end; $$;
grant execute on function public.eligibility(uuid,text) to authenticated;


-- ---------- 5. Applications ----------
create table if not exists public.course_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id  text not null references public.courses(id) on delete cascade,
  status text not null default 'submitted'
    check (status in ('submitted','approved','rejected','withdrawn')),
  motivation text,
  decided_by uuid references public.profiles(id),
  decided_on timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  unique (student_id, course_id)
);
create index if not exists applications_status_idx on public.course_applications(status, created_at);
alter table public.course_applications enable row level security;

drop policy if exists "apps_own_read" on public.course_applications;
create policy "apps_own_read" on public.course_applications
  for select using (auth.uid() = student_id or public.is_admin());
-- A learner may apply for themselves and withdraw; only staff decide.
drop policy if exists "apps_own_insert" on public.course_applications;
create policy "apps_own_insert" on public.course_applications
  for insert with check (auth.uid() = student_id);
drop policy if exists "apps_admin" on public.course_applications;
create policy "apps_admin" on public.course_applications
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 6. Enrolment stops being self-service ----------
-- The old policy let anyone insert their own enrolment, which made the
-- whole vetting step decorative. Enrolment now happens only when an
-- application is approved.
drop policy if exists "enrollments_insert_own" on public.enrollments;
drop policy if exists "enrollments_admin_insert" on public.enrollments;
create policy "enrollments_admin_insert" on public.enrollments
  for insert with check (public.is_admin());


-- ---------- 7. Applying, and deciding ----------
create or replace function public.apply_for_course(p_course text, p_motivation text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_elig jsonb;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  if exists (select 1 from public.enrollments
             where student_id = auth.uid() and course_id = p_course) then
    return jsonb_build_object('ok', false, 'reason', 'already_enrolled');
  end if;

  v_elig := public.eligibility(auth.uid(), p_course);

  insert into public.course_applications (student_id, course_id, motivation)
  values (auth.uid(), p_course, nullif(btrim(coalesce(p_motivation,'')),''))
  on conflict (student_id, course_id) do update
    set status = case when public.course_applications.status = 'rejected'
                      then 'submitted' else public.course_applications.status end,
        motivation = coalesce(excluded.motivation, public.course_applications.motivation);

  return jsonb_build_object('ok', true, 'eligibility', v_elig);
end; $$;
revoke all on function public.apply_for_course(text,text) from public;
grant execute on function public.apply_for_course(text,text) to authenticated;


create or replace function public.decide_application(
  p_application uuid, p_decision text, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a record; v_elig jsonb;
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'Unknown decision'; end if;

  select * into a from public.course_applications where id = p_application;
  if a is null then raise exception 'No such application'; end if;

  if p_decision = 'approved' then
    -- approving is what creates the enrolment, so the check belongs here
    v_elig := public.eligibility(a.student_id, a.course_id);
    if (v_elig->>'eligible')::boolean is not true then
      return jsonb_build_object('ok', false, 'reason', 'not_eligible', 'eligibility', v_elig);
    end if;

    insert into public.enrollments (student_id, course_id, status, progress)
    values (a.student_id, a.course_id, 'in_progress', 0)
    on conflict do nothing;
  end if;

  update public.course_applications
     set status = p_decision, decided_by = auth.uid(),
         decided_on = now(), decision_note = p_note
   where id = p_application;

  return jsonb_build_object('ok', true, 'status', p_decision);
end; $$;
revoke all on function public.decide_application(uuid,text,text) from public;
grant execute on function public.decide_application(uuid,text,text) to authenticated;


create or replace function public.set_vetting(
  p_student uuid, p_status text, p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  if p_status not in ('pending','approved','rejected','suspended') then
    raise exception 'Unknown vetting status';
  end if;
  update public.profiles
     set vetting_status = p_status, vetted_by = auth.uid(),
         vetted_on = now(), vetting_note = p_note
   where id = p_student;
end; $$;
revoke all on function public.set_vetting(uuid,text,text) from public;
grant execute on function public.set_vetting(uuid,text,text) to authenticated;


-- ---------- 8. The two queues the desk works from ----------
create or replace function public.admin_vetting_queue()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', p.id, 'full_name', p.full_name,
             'first_name', p.first_name, 'last_name', p.last_name,
             'date_of_birth', p.date_of_birth, 'phone', p.phone,
             'email', u.email, 'address', p.address_line,
             'district', p.district, 'sector', p.sector,
             'national_id', p.national_id, 'country', p.country_name,
             'gender', p.gender, 'role', p.role,
             'status', p.vetting_status, 'joined', p.created_at)
           order by p.created_at)
    from public.profiles p join auth.users u on u.id = p.id
    where p.role in ('student','professional')
      and p.vetting_status in ('pending','rejected','suspended')
  ), '[]'::jsonb);
end; $$;
revoke all on function public.admin_vetting_queue() from public;
grant execute on function public.admin_vetting_queue() to authenticated;


create or replace function public.admin_applications()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', a.id, 'student_id', a.student_id,
             'full_name', p.full_name, 'vetting', p.vetting_status,
             'course_id', a.course_id, 'course', c.title,
             'status', a.status, 'motivation', a.motivation,
             'created_at', a.created_at,
             'eligibility', public.eligibility(a.student_id, a.course_id))
           order by a.created_at)
    from public.course_applications a
    join public.profiles p on p.id = a.student_id
    join public.courses  c on c.id = a.course_id
    where a.status = 'submitted'
  ), '[]'::jsonb);
end; $$;
revoke all on function public.admin_applications() from public;
grant execute on function public.admin_applications() to authenticated;


-- ---------- 9. Sanity checks ----------
-- select vetting_status, count(*) from public.profiles group by vetting_status;
-- select public.admin_vetting_queue();
-- select public.eligibility('<student-uuid>','KG-108');

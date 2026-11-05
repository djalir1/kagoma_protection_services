-- ============================================================
-- KAGOMA — Migration 53: Users edit their own data, never their authority
--
-- The "update own profile" policy allowed every column, so any signed-in
-- user could set role = 'admin' through the API. Triggers now keep the
-- protected columns unchanged unless the caller is an administrator or
-- the change comes from a SECURITY DEFINER function (which runs as the
-- table owner, not as 'authenticated').
--
-- Also: quotations can only be accepted/declined by the client; public
-- requests and applications always start at the beginning; a
-- professional can only withdraw an application; and staff (not only
-- admins) run the event desk and talent pool.
-- ============================================================

create or replace function public.from_api() returns boolean
language sql stable as $$ select current_user in ('authenticated','anon') $$;

create or replace function public.trg_guard_profile()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.from_api() and not public.is_admin() then
    new.role := old.role;
    new.vetting_status := old.vetting_status;
    new.vetted_by := old.vetted_by;
    new.vetted_on := old.vetted_on;
    new.vetting_note := old.vetting_note;
    new.staff_title := old.staff_title;
    new.access_granted_by := old.access_granted_by;
    new.access_granted_on := old.access_granted_on;
    new.listed := old.listed;
    new.listed_on := old.listed_on;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_profile on public.profiles;
create trigger trg_guard_profile before update on public.profiles
for each row execute function public.trg_guard_profile();

create or replace function public.trg_guard_pro_profile()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.from_api() and not public.is_admin() then
    if tg_op = 'UPDATE' then new.verification_level := old.verification_level;
    else new.verification_level := 'none'; end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_pro_profile on public.professional_profiles;
create trigger trg_guard_pro_profile before insert or update on public.professional_profiles
for each row execute function public.trg_guard_pro_profile();
select public.refresh_verification_level(id) from public.professional_profiles;

create or replace function public.trg_guard_quotation()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.from_api() and not public.is_staff() then
    if new.status not in ('accepted','declined') then
      raise exception 'A quotation can only be accepted or declined';
    end if;
    new.officers := old.officers; new.days := old.days; new.currency := old.currency;
    new.amount := old.amount; new.valid_until := old.valid_until; new.notes := old.notes;
    new.request_id := old.request_id; new.created_by := old.created_by;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_quotation on public.quotations;
create trigger trg_guard_quotation before update on public.quotations
for each row execute function public.trg_guard_quotation();

create or replace function public.trg_guard_new_request()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.from_api() and not public.is_staff() then
    new.status := 'requested';
    new.reference := null;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_new_request on public.service_requests;
create trigger trg_guard_new_request before insert on public.service_requests
for each row execute function public.trg_guard_new_request();
-- triggers fire alphabetically: the reference is assigned after the guard
drop trigger if exists trg_service_reference on public.service_requests;
create trigger trg_zz_service_reference before insert on public.service_requests
for each row execute function public.trg_service_reference();

create or replace function public.trg_guard_new_application()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.from_api() and not public.is_admin() then
    new.status := 'submitted'; new.decided_by := null; new.decided_on := null; new.decision_note := null;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_new_application on public.course_applications;
create trigger trg_guard_new_application before insert on public.course_applications
for each row execute function public.trg_guard_new_application();

create or replace function public.trg_guard_job_application()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.from_api() and not public.is_admin() then
    if tg_op = 'INSERT' then new.status := 'submitted';
    elsif auth.uid() = old.professional_id
          and not exists (select 1 from public.jobs j where j.id = old.job_id and j.employer_id = auth.uid()) then
      if new.status <> old.status and new.status <> 'withdrawn' then
        raise exception 'You can only withdraw an application';
      end if;
    end if;
  end if;
  return new;
end; $$;
drop trigger if exists trg_guard_job_application on public.job_applications;
create trigger trg_guard_job_application before insert or update on public.job_applications
for each row execute function public.trg_guard_job_application();

-- progress is computed by the platform, not edited by the learner
drop policy if exists "enrollments_update_own_or_admin" on public.enrollments;

-- staff run the event desk, the talent pool and the client register
do $$
declare f record; def text;
begin
  for f in
    select p.oid from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in ('clock_in','clock_out','adjust_shift','event_roster','event_payroll',
                        'event_offers','event_manifest','call_to_event','search_pool',
                        'screen_pool_entry','pool_summary','client_register','record_agreement',
                        'record_service_order')
  loop
    def := pg_get_functiondef(f.oid);
    if position('public.is_admin()' in def) > 0 then
      execute replace(def, 'public.is_admin()', 'public.is_staff()');
    end if;
  end loop;
end $$;
drop policy if exists "pool_staff" on public.work_pool;
create policy "pool_staff" on public.work_pool for all
  using (public.is_staff()) with check (public.is_staff());

-- one call for the staff dashboard (see the live definition for the full body)
-- public.staff_inbox() returns counts of what needs attention plus recent
-- requests, upcoming events and enrolments by course.

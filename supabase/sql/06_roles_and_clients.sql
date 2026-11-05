-- ============================================================
-- KAGOMA — Migration 4: Account roles + Security Client capability
--
--        KAGOMA -> Create Account
--    Student | Professional | Employer      (exclusive account role)
--                    |
--             Security Client               (capability shared by all)
--
-- Run in Supabase -> SQL Editor AFTER 01 and 04.
-- Safe to re-run.
-- ============================================================

-- ---------- 1. Allow 'professional' as an account role ----------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student','professional','employer','admin'));

comment on column public.profiles.role is
  'student | professional | employer | admin. Any of them may also act as a Security Client.';

-- ---------- 2. Signup trigger honours the requested role ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  -- Self-signup may request these three only. 'admin' is granted by staff.
  if requested_role not in ('student','professional','employer') then
    requested_role := 'student';
  end if;

  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), requested_role);

  -- A professional gets an (invisible) profile row straight away so the
  -- portal has something to edit instead of failing on first save.
  if requested_role = 'professional' then
    insert into public.professional_profiles (id) values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

-- ---------- 3. A student who graduates can become a professional ----------
create or replace function public.become_professional()
returns void
language plpgsql
security definer
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;

  update public.profiles
     set role = 'professional'
   where id = auth.uid()
     and role = 'student';   -- employers/admins are never silently converted

  insert into public.professional_profiles (id) values (auth.uid())
  on conflict (id) do nothing;
end;
$$;

revoke all on function public.become_professional() from public;
grant execute on function public.become_professional() to authenticated;

-- ---------- 4. Professional profiles: students AND professionals ----------
-- (A student may build a profile while still training; it stays invisible
--  until they choose to publish it.)
drop policy if exists "prof_profiles_select" on public.professional_profiles;
create policy "prof_profiles_select" on public.professional_profiles
  for select using (
    (visible = true and auth.uid() is not null)
    or auth.uid() = id
    or public.is_admin()
  );

-- ---------- 5. Security Client: link requests to an account ----------
alter table public.service_requests
  add column if not exists requested_by uuid references public.profiles(id) on delete set null;

create index if not exists service_requests_requested_by_idx
  on public.service_requests(requested_by);

-- Anonymous visitors may still submit from the public website form,
-- but nobody may forge a request in someone else's name.
drop policy if exists "service_requests_public_insert" on public.service_requests;
create policy "service_requests_insert" on public.service_requests
  for insert with check (
    requested_by is null or requested_by = auth.uid()
  );

-- A signed-in client can follow their own requests; admins see everything.
drop policy if exists "service_requests_admin_select" on public.service_requests;
create policy "service_requests_select" on public.service_requests
  for select using (
    (requested_by is not null and requested_by = auth.uid())
    or public.is_admin()
  );

-- Only staff change the status of a request.
drop policy if exists "service_requests_admin_update" on public.service_requests;
create policy "service_requests_update" on public.service_requests
  for update using (public.is_admin());

-- ---------- 6. Sanity checks ----------
-- select role, count(*) from public.profiles group by role order by role;
-- select count(*) filter (where requested_by is null)  as anonymous,
--        count(*) filter (where requested_by is not null) as from_account
--   from public.service_requests;

-- ============================================================
-- KAGOMA — Migration 2: Employer role + Professional Profiles
-- Run this in Supabase → SQL Editor → New Query → Run
-- (Run AFTER 01_schema.sql has already been applied)
-- ============================================================

-- ---------- Allow 'employer' as a role ----------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student','employer','admin'));

-- ---------- Update signup trigger to honor a requested role ----------
-- (Self-signup can request 'student' or 'employer'; anything else falls
--  back to 'student'. Only Kagoma staff can promote someone to 'admin'.)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if requested_role not in ('student','employer') then
    requested_role := 'student';
  end if;
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), requested_role);
  return new;
end;
$$;

-- ---------- PROFESSIONAL PROFILES (one per student, opt-in visible) ----------
create table public.professional_profiles (
  id uuid primary key references public.profiles(id) on delete cascade,
  headline text,
  bio text,
  location text,
  years_experience int,
  languages text,
  availability text not null default 'available' check (availability in ('available','not_available')),
  visible boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.professional_profiles enable row level security;

-- Visible profiles can be browsed by any logged-in user (employers);
-- a student can always see/edit their own row; admins see everything.
create policy "prof_profiles_select" on public.professional_profiles
  for select using (
    (visible = true and auth.uid() is not null)
    or auth.uid() = id
    or public.is_admin()
  );
create policy "prof_profiles_insert_own" on public.professional_profiles
  for insert with check (auth.uid() = id);
create policy "prof_profiles_update_own" on public.professional_profiles
  for update using (auth.uid() = id);

-- ---------- EMPLOYER RECRUITMENT REQUESTS ----------
create table public.employer_requests (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.profiles(id) on delete cascade,
  role_needed text not null,
  quantity int not null default 1,
  location text,
  start_date date,
  details text,
  status text not null default 'new' check (status in ('new','reviewing','matched','closed')),
  created_at timestamptz not null default now()
);

alter table public.employer_requests enable row level security;

create policy "employer_requests_insert_own" on public.employer_requests
  for insert with check (auth.uid() = employer_id);
create policy "employer_requests_select_own_or_admin" on public.employer_requests
  for select using (auth.uid() = employer_id or public.is_admin());

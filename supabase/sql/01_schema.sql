-- ============================================================
-- KAGOMA PROTECTION SERVICES — Phase 1 Database Schema
-- Run this once in Supabase → SQL Editor → New Query → Run
-- ============================================================

-- ---------- PROFILES (one row per logged-in user) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student','admin')),
  created_at timestamptz not null default now()
);

-- ---------- COURSES ----------
create table public.courses (
  id text primary key,              -- e.g. 'KG-101'
  title text not null,
  description text,
  created_at timestamptz not null default now()
);

-- ---------- ENROLLMENTS ----------
create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  status text not null default 'enrolled' check (status in ('enrolled','in_progress','completed')),
  progress int not null default 0 check (progress between 0 and 100),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (student_id, course_id)
);

-- ---------- CERTIFICATES ----------
create table public.certificates (
  id text primary key,              -- e.g. 'KG-CERT-2026-A3F9K2'
  student_id uuid references public.profiles(id) on delete set null,
  course_id text references public.courses(id) on delete set null,
  student_name text not null,
  course_name text not null,
  issue_date date not null,
  issued_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- ---------- SECURITY SERVICE REQUESTS (public "I need security" form) ----------
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  email text not null,
  phone text,
  event_name text,
  event_type text,
  event_date date,
  location text,
  expected_attendees int,
  details text,
  status text not null default 'new' check (status in ('new','reviewing','quoted','confirmed','completed','closed')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- HELPER: check if the current logged-in user is an admin
-- (security definer = runs with elevated rights, avoids
--  recursive RLS lookups on the profiles table)
-- ============================================================
create function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- AUTO-CREATE a profile row whenever someone signs up
-- ============================================================
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'student');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY (RLS) — who can see/change what
-- ============================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.enrollments enable row level security;
alter table public.certificates enable row level security;
alter table public.service_requests enable row level security;

-- PROFILES: a user can see/update only their own profile; admins see all
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- COURSES: everyone (even logged-out visitors) can view the catalog; only admins manage
create policy "courses_public_read" on public.courses
  for select using (true);
create policy "courses_admin_write" on public.courses
  for insert with check (public.is_admin());
create policy "courses_admin_update" on public.courses
  for update using (public.is_admin());
create policy "courses_admin_delete" on public.courses
  for delete using (public.is_admin());

-- ENROLLMENTS: a student sees/manages only their own; admins see all
create policy "enrollments_select_own_or_admin" on public.enrollments
  for select using (auth.uid() = student_id or public.is_admin());
create policy "enrollments_insert_own" on public.enrollments
  for insert with check (auth.uid() = student_id);
create policy "enrollments_update_own_or_admin" on public.enrollments
  for update using (auth.uid() = student_id or public.is_admin());

-- CERTIFICATES: anyone can look one up by ID (public verification);
-- only admins can issue (insert) certificates
create policy "certificates_public_read" on public.certificates
  for select using (true);
create policy "certificates_admin_insert" on public.certificates
  for insert with check (public.is_admin());

-- SERVICE REQUESTS: anyone can submit a request; only admins can view/manage them
create policy "service_requests_public_insert" on public.service_requests
  for insert with check (true);
create policy "service_requests_admin_select" on public.service_requests
  for select using (public.is_admin());
create policy "service_requests_admin_update" on public.service_requests
  for update using (public.is_admin());

-- ============================================================
-- SEED: the 9 professional training courses
-- ============================================================
insert into public.courses (id, title, description) values
  ('KG-101','Event Security Management','Planning, staffing and coordinating security for large public events.'),
  ('KG-102','Crowd Management','Controlling density, flow and emergency egress in large crowds.'),
  ('KG-103','Loss Prevention Management','Identifying and controlling sources of shrinkage in retail and operations.'),
  ('KG-104','Hospitality Security Management','Security operations tailored to hotels, resorts and guest-facing venues.'),
  ('KG-105','International Security & Risk Management','Cross-border risk frameworks for international operations and travel.'),
  ('KG-106','Close Protection & Executive Protection','Advance planning, route security and personal protection techniques.'),
  ('KG-107','First Aid','Emergency response and basic life-support skills for security personnel.'),
  ('KG-108','Advanced Security Guard Course','Advanced patrol, reporting and incident-response competencies.'),
  ('KG-109','Security Professional Etiquette','Conduct, communication and presentation standards for security staff.');

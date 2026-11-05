-- ============================================================
-- KAGOMA — Migration 36: A learner and a professional are one person
--
-- Until now someone had to choose: sign up as a student, or sign up
-- as a professional. But they are the same person at two moments of
-- the same path. Someone who signed up on the professional page was
-- not counted as a learner, and their certificate sat under a role
-- that had never studied anything.
--
--   learner  ->  studies, is vetted, earns a certificate
--            ->  may then choose to be listed to employers
--
-- Employer and client stay separate: those are organisations, not
-- stages of one person's path.
--
-- Run AFTER 01..37. Safe to re-run.
-- ============================================================

-- ---------- 1. Listing is a choice, not a role ----------
alter table public.profiles add column if not exists listed boolean not null default false;
alter table public.profiles add column if not exists listed_on timestamptz;
alter table public.profiles add column if not exists headline text;
alter table public.profiles add column if not exists available boolean not null default true;

comment on column public.profiles.listed is
  'The learner has asked to appear in the professional directory. It is a
   switch they turn on, not a different account they sign up for.';


-- ---------- 2. Everyone who was a professional is a learner who is listed ----------
do $$
declare n int;
begin
  update public.profiles
     set listed = true,
         listed_on = coalesce(listed_on, now()),
         role = 'student'
   where role = 'professional';
  get diagnostics n = row_count;
  if n > 0 then
    raise notice 'Moved % professional account(s) to learner-and-listed.', n;
  end if;
end $$;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student','professional','employer','client','admin'));
-- 'professional' stays allowed so older rows and other migrations do not
-- break; nothing creates it any more.


-- ---------- 3. Who may be listed ----------
-- The same bar as before: vetted, and holding a valid certificate.
-- Wanting to be listed has never been enough.
create or replace function public.can_be_listed(p_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = p_id
      and p.vetting_status = 'approved'
      and exists (select 1 from public.certificates c
                   where c.student_id = p_id and c.status = 'valid'));
$$;
grant execute on function public.can_be_listed(uuid) to authenticated;


create or replace function public.set_listed(p_on boolean, p_headline text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;

  if p_on and not public.can_be_listed(auth.uid()) then
    return jsonb_build_object('ok', false, 'reason', 'not_eligible');
  end if;

  update public.profiles
     set listed = p_on,
         listed_on = case when p_on then coalesce(listed_on, now()) else listed_on end,
         headline = coalesce(nullif(btrim(coalesce(p_headline,'')),''), headline)
   where id = auth.uid();

  return jsonb_build_object('ok', true, 'listed', p_on);
end; $$;
grant execute on function public.set_listed(boolean,text) to authenticated;


-- ---------- 4. What one person can do right now ----------
create or replace function public.my_capabilities()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p record; ncerts int; ncourses int;
begin
  if auth.uid() is null then return jsonb_build_object('signed_in', false); end if;

  select * into p from public.profiles where id = auth.uid();
  select count(*) into ncerts   from public.certificates
   where student_id = auth.uid() and status = 'valid';
  select count(*) into ncourses from public.enrollments where student_id = auth.uid();

  return jsonb_build_object(
    'signed_in', true,
    'role', p.role,
    'name', p.full_name,
    'vetting', p.vetting_status,
    'courses', ncourses,
    'certificates', ncerts,
    -- the directory
    'can_be_listed', public.can_be_listed(auth.uid()),
    'listed', coalesce(p.listed, false),
    'available', coalesce(p.available, true),
    'headline', p.headline,
    -- which desks this person may open
    'may_learn', p.role in ('student','professional','admin'),
    'may_hire',  p.role in ('employer','admin'),
    'may_buy',   p.role in ('client','employer','admin'),
    'may_admin', p.role = 'admin');
end; $$;
grant execute on function public.my_capabilities() to authenticated;


-- ---------- 5. The directory reads the switch, not the role ----------
create or replace function public.professional_directory(
  p_query text default null, p_district text default null
) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.full_name,
    'headline', p.headline,
    'district', p.district,
    'available', p.available,
    'certificates', (select count(*) from public.certificates c
                      where c.student_id = p.id and c.status = 'valid'),
    'since', p.listed_on
  ) order by p.full_name), '[]'::jsonb)
  from public.profiles p
  where p.listed = true
    and p.vetting_status = 'approved'
    and exists (select 1 from public.certificates c
                 where c.student_id = p.id and c.status = 'valid')
    and (p_query is null or p.full_name ilike '%'||p_query||'%'
         or p.headline ilike '%'||p_query||'%')
    and (p_district is null or p.district ilike '%'||p_district||'%');
$$;
grant execute on function public.professional_directory(text,text) to authenticated;


-- ---------- 6. A learner who loses the bar drops out of the directory ----------
-- A revoked certificate or a withdrawn vetting must not leave someone
-- listed. It is checked at read time above, and cleared here so the
-- switch on their own page tells them the truth.
create or replace function public.trg_unlist_if_ineligible()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
     set listed = false
   where listed = true and not public.can_be_listed(id);
  return null;
end; $$;

drop trigger if exists trg_unlist_cert on public.certificates;
create trigger trg_unlist_cert
after update or delete on public.certificates
for each statement execute function public.trg_unlist_if_ineligible();

drop trigger if exists trg_unlist_vetting on public.profiles;
create trigger trg_unlist_vetting
after update of vetting_status on public.profiles
for each statement execute function public.trg_unlist_if_ineligible();

-- Sanity checks
-- select role, listed, count(*) from public.profiles group by 1,2 order by 1,2;
-- select public.professional_directory();

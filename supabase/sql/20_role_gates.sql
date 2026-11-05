-- ============================================================
-- KAGOMA — Migration 18: Role gates
--
-- The policies so far asked "is this your own row?" but never "are you
-- the kind of user who may do this?". A student could therefore post a
-- job, write to professionals as though they were an employer, and —
-- worst of the three — publish themselves in the professional directory
-- without ever being vetted or certified.
--
-- Run AFTER 01..19. Safe to re-run.
-- ============================================================

create or replace function public.has_role(p_roles text[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = any(p_roles));
$$;
grant execute on function public.has_role(text[]) to authenticated;


-- ---------- 1. Only an employer posts jobs ----------
drop policy if exists "jobs_write_own" on public.jobs;
create policy "jobs_write_own" on public.jobs
  for all
  using (auth.uid() = employer_id and (public.has_role(array['employer']) or public.is_admin()))
  with check (auth.uid() = employer_id and (public.has_role(array['employer']) or public.is_admin()));


-- ---------- 2. Only an employer approaches a professional ----------
drop policy if exists "emp_contacts_insert" on public.employer_contacts;
create policy "emp_contacts_insert" on public.employer_contacts
  for insert with check (
    auth.uid() = employer_id
    and (public.has_role(array['employer']) or public.is_admin())
    and exists (select 1 from public.professional_profiles p
                where p.id = professional_id and p.visible = true)
  );


-- ---------- 3. The directory must mean something ----------
-- Anyone may build a profile while they train. Publishing it is the
-- claim "Kagoma trained me", and that claim has to be earned: the
-- person must be vetted and hold at least one certificate that is
-- currently valid.
create or replace function public.trg_guard_visibility()
returns trigger
language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  if new.visible is not true then
    return new;                      -- hiding yourself needs no proof
  end if;
  if coalesce(old.visible, false) = true then
    return new;                      -- already published, nothing new claimed
  end if;

  select vetting_status into v_status from public.profiles where id = new.id;
  if v_status is distinct from 'approved' then
    raise exception 'A profile cannot be published before the account is vetted';
  end if;

  if not exists (select 1 from public.certificates
                 where student_id = new.id and status = 'valid') then
    raise exception 'A profile cannot be published without a valid Kagoma certificate';
  end if;

  return new;
end; $$;

drop trigger if exists trg_guard_visibility on public.professional_profiles;
create trigger trg_guard_visibility
before insert or update on public.professional_profiles
for each row execute function public.trg_guard_visibility();

-- Anyone already listed without a certificate is taken back off the
-- directory rather than left there on a claim nobody checked.
update public.professional_profiles p
   set visible = false
 where p.visible = true
   and not exists (select 1 from public.certificates c
                   where c.student_id = p.id and c.status = 'valid');


-- ---------- 4. Service requests: keep them, but tie them to the account ----------
-- Any signed-in person may ask Kagoma for security services, which is
-- correct: a student may also run a business. Nothing changes here
-- beyond what migration 06 already set.


-- ---------- 5. What each account may do, for the pages to read ----------
create or replace function public.my_capabilities()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r text; v text; ncerts int;
begin
  if auth.uid() is null then return jsonb_build_object('signed_in', false); end if;
  select role, vetting_status into r, v from public.profiles where id = auth.uid();
  select count(*) into ncerts from public.certificates
   where student_id = auth.uid() and status = 'valid';

  return jsonb_build_object(
    'signed_in', true,
    'role', r,
    'vetting', v,
    'certificates', ncerts,
    'can_learn',        r in ('student','professional'),
    'can_be_listed',    r in ('student','professional') and v = 'approved' and ncerts > 0,
    'can_hire',         r = 'employer' or r = 'admin',
    'can_request',      true,
    'is_admin',         coalesce(public.is_admin(), false)
  );
end; $$;
grant execute on function public.my_capabilities() to authenticated;


-- ---------- 6. Sanity checks ----------
-- select public.my_capabilities();
-- select count(*) from public.professional_profiles where visible;

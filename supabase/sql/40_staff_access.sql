-- ============================================================
-- KAGOMA — Migration 38: Two levels of staff, not one
--
-- Until now there was one staff role. A supervisor who needed to tap
-- people in at a gate had to be made an administrator, and an
-- administrator can revoke any certificate Kagoma has ever issued.
--
--   admin  — everything, including granting access to others
--   staff  — the daily desks: events, roster, clock, documents
--            NOT: revoking certificates, company settings, granting
--            access to anyone else
--
-- Nobody should hold more authority than their job needs.
--
-- Run AFTER 01..39. Safe to re-run.
-- ============================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student','professional','employer','client','staff','admin'));

alter table public.profiles add column if not exists staff_title text;
alter table public.profiles add column if not exists access_granted_by uuid references public.profiles(id);
alter table public.profiles add column if not exists access_granted_on timestamptz;


-- ---------- 1. Who counts as staff ----------
create or replace function public.is_staff(p_id uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles
                  where id = p_id and role in ('staff','admin'));
$$;
grant execute on function public.is_staff(uuid) to authenticated;

-- is_admin stays exactly as it was: only 'admin'.


-- ---------- 2. Granting and withdrawing access ----------
create or replace function public.grant_staff_access(
  p_email text, p_level text default 'staff', p_title text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_current text;
begin
  if not public.is_admin() then raise exception 'Only an administrator can grant access'; end if;
  if p_level not in ('staff','admin') then
    return jsonb_build_object('ok', false, 'reason', 'bad_level');
  end if;

  select u.id, p.role into v_id, v_current
  from auth.users u join public.profiles p on p.id = u.id
  where lower(u.email) = lower(btrim(p_email));

  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'no_account');
  end if;
  if v_id = auth.uid() then
    return jsonb_build_object('ok', false, 'reason', 'yourself');
  end if;

  update public.profiles
     set role = p_level,
         staff_title = nullif(btrim(coalesce(p_title,'')),''),
         vetting_status = 'approved',
         access_granted_by = auth.uid(),
         access_granted_on = now()
   where id = v_id;

  return jsonb_build_object('ok', true, 'level', p_level, 'was', v_current);
end; $$;
revoke all on function public.grant_staff_access(text,text,text) from public;
grant execute on function public.grant_staff_access(text,text,text) to authenticated;


create or replace function public.revoke_staff_access(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare n_admin int; v_role text;
begin
  if not public.is_admin() then raise exception 'Only an administrator can withdraw access'; end if;
  if p_id = auth.uid() then
    return jsonb_build_object('ok', false, 'reason', 'yourself');
  end if;

  select role into v_role from public.profiles where id = p_id;
  if v_role is null then return jsonb_build_object('ok', false, 'reason', 'no_account'); end if;

  -- Kagoma must never be left without an administrator: an office
  -- nobody can open is worse than one too many keys.
  if v_role = 'admin' then
    select count(*) into n_admin from public.profiles where role = 'admin';
    if n_admin <= 1 then
      return jsonb_build_object('ok', false, 'reason', 'last_admin');
    end if;
  end if;

  update public.profiles
     set role = 'student', staff_title = null,
         access_granted_by = null, access_granted_on = null
   where id = p_id;

  return jsonb_build_object('ok', true, 'was', v_role);
end; $$;
revoke all on function public.revoke_staff_access(uuid) from public;
grant execute on function public.revoke_staff_access(uuid) to authenticated;


-- ---------- 3. Who holds access today ----------
create or replace function public.staff_list()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.full_name, 'email', u.email,
      'level', p.role, 'title', p.staff_title,
      'since', p.access_granted_on,
      'granted_by', (select g.full_name from public.profiles g where g.id = p.access_granted_by),
      'is_you', p.id = auth.uid()
    ) order by (p.role = 'admin') desc, p.full_name)
    from public.profiles p join auth.users u on u.id = p.id
    where p.role in ('staff','admin')
  ), '[]'::jsonb);
end; $$;
revoke all on function public.staff_list() from public;
grant execute on function public.staff_list() to authenticated;


-- ---------- 4. What each level may open ----------
create or replace function public.my_capabilities()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p record; ncerts int; ncourses int; adm boolean; stf boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('signed_in', false, 'is_admin', false,
                              'may_admin', false, 'is_staff', false);
  end if;

  select * into p from public.profiles where id = auth.uid();
  if p is null then
    return jsonb_build_object('signed_in', true, 'role', null,
                              'is_admin', false, 'may_admin', false, 'is_staff', false);
  end if;

  adm := (p.role = 'admin');
  stf := (p.role in ('staff','admin'));

  select count(*) into ncerts   from public.certificates
   where student_id = auth.uid() and status = 'valid';
  select count(*) into ncourses from public.enrollments where student_id = auth.uid();

  return jsonb_build_object(
    'signed_in', true,
    'role', p.role,
    'name', p.full_name,
    'staff_title', p.staff_title,
    'vetting', p.vetting_status,
    'courses', ncourses,
    'certificates', ncerts,

    'can_be_listed', public.can_be_listed(auth.uid()),
    'listed', coalesce(p.listed, false),
    'available', coalesce(p.available, true),
    'headline', p.headline,

    -- desks
    'may_learn', p.role in ('student','professional','staff','admin'),
    'may_hire',  p.role in ('employer','admin'),
    'may_buy',   p.role in ('client','employer','admin'),

    -- the daily work: events, roster, clock, documents
    'is_staff',  stf,
    'may_events', stf,
    'may_documents', stf,

    -- reserved to an administrator
    'may_revoke_certificates', adm,
    'may_company_settings', adm,
    'may_grant_access', adm,

    'may_admin', adm,
    'is_admin',  adm);
end; $$;
grant execute on function public.my_capabilities() to authenticated;


-- ---------- 5. Let staff into the desks they now need ----------
do $$
declare t text;
begin
  foreach t in array array['events','event_staff','shifts','documents','event_interest']
  loop
    if to_regclass('public.'||t) is not null then
      execute format('drop policy if exists %I on public.%I', t||'_staff', t);
      execute format(
        'create policy %I on public.%I for all using (public.is_staff()) with check (public.is_staff())',
        t||'_staff', t);
    end if;
  end loop;
end $$;

-- Certificates stay as they were: an administrator revokes, nobody else.

-- Sanity checks
-- select public.staff_list();
-- select role, count(*) from public.profiles group by 1 order by 1;

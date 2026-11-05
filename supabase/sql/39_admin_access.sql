-- ============================================================
-- KAGOMA — Migration 37: Give the admin back every desk
--
-- Migration 36 rewrote my_capabilities and renamed the field the
-- portals read: is_admin became may_admin. The pages still asked for
-- is_admin, got undefined, and refused the administrator from the
-- student, employer, client and professional desks.
--
-- The function now returns both names. A rename that breaks a caller
-- is a rename that should carry the old name with it.
--
-- Run AFTER 01..38. Safe to re-run.
-- ============================================================

create or replace function public.my_capabilities()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p record; ncerts int; ncourses int; is_adm boolean;
begin
  if auth.uid() is null then
    return jsonb_build_object('signed_in', false, 'is_admin', false, 'may_admin', false);
  end if;

  select * into p from public.profiles where id = auth.uid();
  if p is null then
    return jsonb_build_object('signed_in', true, 'role', null,
                              'is_admin', false, 'may_admin', false);
  end if;

  is_adm := (p.role = 'admin');

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

    -- which desks this person may open. An administrator opens all of
    -- them: they answer for what happens on every one.
    'may_learn', p.role in ('student','professional','admin'),
    'may_hire',  p.role in ('employer','admin'),
    'may_buy',   p.role in ('client','employer','admin'),
    'may_admin', is_adm,

    -- the name the portals have always read; kept so a rename in the
    -- database can never again lock the administrator out of a desk
    'is_admin',  is_adm);
end; $$;
grant execute on function public.my_capabilities() to authenticated;

-- Check: signed in as the admin, every one of these must read true.
-- select (public.my_capabilities()->>'is_admin')::boolean  as is_admin,
--        (public.my_capabilities()->>'may_learn')::boolean as learn,
--        (public.my_capabilities()->>'may_hire')::boolean  as hire,
--        (public.my_capabilities()->>'may_buy')::boolean   as buy;

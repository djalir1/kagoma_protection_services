-- ============================================================
-- KAGOMA — Migration 12: Security Client accounts
--
-- A company that only books guarding is not a student. 'client'
-- becomes a first-class account role, while raising a service
-- request stays a CAPABILITY any signed-in user has — the RLS
-- keys on requested_by, never on the role.
--
-- Run AFTER 01..13. Safe to re-run.
-- ============================================================

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('student','professional','employer','client','admin'));

comment on column public.profiles.role is
  'student | professional | employer | client | admin. Any signed-in user may also act as a Security Client.';

-- Allow 'client' at self-signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare requested_role text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if requested_role not in ('student','professional','employer','client') then
    requested_role := 'student';
  end if;

  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), requested_role);

  if requested_role = 'professional' then
    insert into public.professional_profiles (id) values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

-- ---------- The client's own view of a request ----------
-- Returns the request, its stage history and any quotations,
-- for the signed-in owner only.
create or replace function public.my_service_requests()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;

  return coalesce((
    select jsonb_agg(x order by x->>'created_at' desc)
    from (
      select jsonb_build_object(
        'id', r.id,
        'reference', r.reference,
        'event_name', r.event_name,
        'event_type', r.event_type,
        'location', r.location,
        'event_date', r.event_date,
        'expected_attendees', r.expected_attendees,
        'details', r.details,
        'status', r.status,
        'created_at', r.created_at,
        'stages', coalesce((
          select jsonb_agg(jsonb_build_object(
            'stage', s.stage, 'note', s.note, 'created_at', s.created_at
          ) order by s.created_at)
          from public.service_stages s where s.request_id = r.id
        ), '[]'::jsonb),
        'quotations', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', q.id, 'officers', q.officers, 'days', q.days,
            'currency', q.currency, 'amount', q.amount,
            'valid_until', q.valid_until, 'notes', q.notes, 'status', q.status
          ) order by q.created_at desc)
          from public.quotations q where q.request_id = r.id
        ), '[]'::jsonb)
      ) as x, r.created_at
      from public.service_requests r
      where r.requested_by = auth.uid()
    ) s
  ), '[]'::jsonb);
end; $$;
revoke all on function public.my_service_requests() from public;
grant execute on function public.my_service_requests() to authenticated;

-- ---------- Sanity checks ----------
-- select public.my_service_requests();

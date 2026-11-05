-- ============================================================
-- KAGOMA — Migration 30: Event staffing and hours
--
--   An event is created and gets a QR code
--        ↓
--   A worker scans it on their own phone and registers
--        ↓
--   A supervisor taps them in when the shift starts
--        ↓
--   Taps them out at the end
--        ↓
--   Hours and pay are calculated, and can be corrected
--
-- The supervisor holds the clock rather than the worker. A worker who
-- can clock themselves in can do it from home; a supervisor tapping a
-- name is recording something they can see.
--
-- Run AFTER 01..31. Safe to re-run.
-- ============================================================

-- ---------- 1. The event ----------
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  code text unique not null default upper(substr(encode(gen_random_bytes(6),'hex'),1,8)),
  join_token text unique not null default encode(gen_random_bytes(16),'hex'),
  name text not null,
  client_name text,
  venue text,
  starts_on date not null,
  ends_on date,
  call_time time,
  hourly_rate_rwf numeric(10,2),
  staff_needed int,
  notes text,
  status text not null default 'planned'
    check (status in ('planned','open','running','closed','cancelled')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists events_status_idx on public.events(status, starts_on desc);

alter table public.events enable row level security;

drop policy if exists "events_admin" on public.events;
create policy "events_admin" on public.events
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 2. Who is on it ----------
create table if not exists public.event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  person_id uuid references public.profiles(id) on delete set null,
  -- a casual worker who has no account still gets a row
  full_name text not null,
  phone text,
  national_id text,
  role text default 'Steward',
  rate_rwf numeric(10,2),            -- overrides the event rate when set
  status text not null default 'registered'
    check (status in ('registered','confirmed','no_show','removed')),
  registered_at timestamptz not null default now(),
  unique (event_id, person_id),
  unique (event_id, phone)
);
create index if not exists estaff_event_idx on public.event_staff(event_id, full_name);
alter table public.event_staff enable row level security;

drop policy if exists "estaff_admin" on public.event_staff;
create policy "estaff_admin" on public.event_staff
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "estaff_own_read" on public.event_staff;
create policy "estaff_own_read" on public.event_staff
  for select using (public.is_admin() or auth.uid() = person_id);

-- A worker sees the events they are on. This policy reads event_staff,
-- so it is created here rather than beside the events table: Postgres
-- checks the tables a policy names at the moment it is defined.
drop policy if exists "events_own_read" on public.events;
create policy "events_own_read" on public.events
  for select using (
    public.is_admin() or exists (
      select 1 from public.event_staff s
      where s.event_id = events.id and s.person_id = auth.uid()));


-- ---------- 3. The clock ----------
create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  staff_id uuid not null references public.event_staff(id) on delete cascade,
  clock_in  timestamptz,
  clock_out timestamptz,
  -- set by hand when a tap was missed or a correction is agreed
  hours_override numeric(6,2),
  rate_rwf numeric(10,2),
  amount_override numeric(12,2),
  note text,
  opened_by uuid references public.profiles(id),
  closed_by uuid references public.profiles(id),
  edited_by uuid references public.profiles(id),
  edited_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists shifts_event_idx on public.shifts(event_id);
create index if not exists shifts_staff_idx on public.shifts(staff_id);
alter table public.shifts enable row level security;

drop policy if exists "shifts_admin" on public.shifts;
create policy "shifts_admin" on public.shifts
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "shifts_own_read" on public.shifts;
create policy "shifts_own_read" on public.shifts
  for select using (
    public.is_admin() or exists (
      select 1 from public.event_staff s
      where s.id = shifts.staff_id and s.person_id = auth.uid()));


-- ---------- 4. Hours and pay, worked out once ----------
create or replace function public.shift_hours(p_shift uuid)
returns numeric
language sql stable security definer set search_path = public as $$
  select case
    when s.hours_override is not null then s.hours_override
    when s.clock_in is not null and s.clock_out is not null
      then round(extract(epoch from (s.clock_out - s.clock_in))/3600.0, 2)
    else 0
  end
  from public.shifts s where s.id = p_shift;
$$;
grant execute on function public.shift_hours(uuid) to authenticated;

create or replace function public.shift_amount(p_shift uuid)
returns numeric
language sql stable security definer set search_path = public as $$
  select case
    when s.amount_override is not null then s.amount_override
    else round(public.shift_hours(s.id) *
      coalesce(s.rate_rwf, es.rate_rwf, e.hourly_rate_rwf, 0), 0)
  end
  from public.shifts s
  join public.event_staff es on es.id = s.staff_id
  join public.events e on e.id = s.event_id
  where s.id = p_shift;
$$;
grant execute on function public.shift_amount(uuid) to authenticated;


-- ---------- 5. Registering from the QR code ----------
-- The link carries only the event's join token. It is not the event id,
-- so a token can be rotated if a poster is photographed and shared.
create or replace function public.event_by_token(p_token text)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'id', id, 'name', name, 'client', client_name, 'venue', venue,
    'starts_on', starts_on, 'call_time', call_time, 'status', status,
    'open', status in ('open','running'))
  from public.events where join_token = p_token;
$$;
grant execute on function public.event_by_token(text) to anon, authenticated;


create or replace function public.join_event(
  p_token text, p_name text, p_phone text,
  p_nid text default null, p_role text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e record; v_id uuid; v_person uuid;
begin
  select * into e from public.events where join_token = p_token;
  if e is null then return jsonb_build_object('ok', false, 'reason', 'unknown_event'); end if;
  if e.status not in ('open','running') then
    return jsonb_build_object('ok', false, 'reason', 'not_open');
  end if;
  if btrim(coalesce(p_name,'')) = '' or btrim(coalesce(p_phone,'')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'need_name_and_phone');
  end if;

  v_person := auth.uid();     -- null for a casual worker with no account

  -- the same phone twice is the same person arriving twice, not two people
  select id into v_id from public.event_staff
   where event_id = e.id and phone = btrim(p_phone);

  if v_id is not null then
    update public.event_staff
       set full_name = btrim(p_name),
           national_id = coalesce(nullif(btrim(coalesce(p_nid,'')),''), national_id),
           role = coalesce(nullif(btrim(coalesce(p_role,'')),''), role),
           person_id = coalesce(person_id, v_person)
     where id = v_id;
    return jsonb_build_object('ok', true, 'already', true, 'event', e.name);
  end if;

  insert into public.event_staff (event_id, person_id, full_name, phone, national_id, role)
  values (e.id, v_person, btrim(p_name), btrim(p_phone),
          nullif(btrim(coalesce(p_nid,'')),''),
          coalesce(nullif(btrim(coalesce(p_role,'')),''), 'Steward'))
  returning id into v_id;

  return jsonb_build_object('ok', true, 'already', false, 'event', e.name);
end; $$;
grant execute on function public.join_event(text,text,text,text,text) to anon, authenticated;


-- ---------- 6. The clock, one tap each way ----------
create or replace function public.clock_in(p_staff uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare s record; v_id uuid;
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  select * into s from public.event_staff where id = p_staff;
  if s is null then raise exception 'No such person on this event'; end if;

  -- an open shift means they are already in; do not start a second one
  if exists (select 1 from public.shifts
             where staff_id = p_staff and clock_out is null) then
    return jsonb_build_object('ok', false, 'reason', 'already_in');
  end if;

  insert into public.shifts (event_id, staff_id, clock_in, opened_by)
  values (s.event_id, p_staff, now(), auth.uid())
  returning id into v_id;

  update public.event_staff set status = 'confirmed' where id = p_staff;
  update public.events set status = 'running'
   where id = s.event_id and status = 'open';

  return jsonb_build_object('ok', true, 'shift', v_id);
end; $$;
revoke all on function public.clock_in(uuid) from public;
grant execute on function public.clock_in(uuid) to authenticated;


create or replace function public.clock_out(p_staff uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;

  select id into v_id from public.shifts
   where staff_id = p_staff and clock_out is null
   order by clock_in desc limit 1;
  if v_id is null then
    return jsonb_build_object('ok', false, 'reason', 'not_in');
  end if;

  update public.shifts set clock_out = now(), closed_by = auth.uid() where id = v_id;
  return jsonb_build_object('ok', true, 'hours', public.shift_hours(v_id),
                            'amount', public.shift_amount(v_id));
end; $$;
revoke all on function public.clock_out(uuid) from public;
grant execute on function public.clock_out(uuid) to authenticated;


-- ---------- 7. Correcting a shift ----------
-- A tap gets missed. Rather than let anyone rewrite the clock, the
-- original times stay and the correction is recorded beside them.
create or replace function public.adjust_shift(
  p_shift uuid, p_hours numeric default null,
  p_amount numeric default null, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  update public.shifts
     set hours_override  = p_hours,
         amount_override = p_amount,
         note = coalesce(p_note, note),
         edited_by = auth.uid(), edited_at = now()
   where id = p_shift;
  return jsonb_build_object('ok', true,
    'hours', public.shift_hours(p_shift), 'amount', public.shift_amount(p_shift));
end; $$;
revoke all on function public.adjust_shift(uuid,numeric,numeric,text) from public;
grant execute on function public.adjust_shift(uuid,numeric,numeric,text) to authenticated;


-- ---------- 8. The roster the supervisor works from ----------
create or replace function public.event_roster(p_event uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'staff_id', es.id, 'name', es.full_name, 'phone', es.phone,
      'role', es.role, 'status', es.status,
      'rate', coalesce(es.rate_rwf, e.hourly_rate_rwf),
      'shift_id', sh.id,
      'in',  sh.clock_in, 'out', sh.clock_out,
      'on_duty', (sh.id is not null and sh.clock_out is null),
      'hours',  coalesce(public.shift_hours(sh.id), 0),
      'amount', coalesce(public.shift_amount(sh.id), 0),
      'edited', sh.edited_at is not null
    ) order by es.full_name)
    from public.event_staff es
    join public.events e on e.id = es.event_id
    left join lateral (
      select * from public.shifts s where s.staff_id = es.id
       order by s.clock_in desc nulls last limit 1) sh on true
    where es.event_id = p_event and es.status <> 'removed'
  ), '[]'::jsonb);
end; $$;
revoke all on function public.event_roster(uuid) from public;
grant execute on function public.event_roster(uuid) to authenticated;


-- ---------- 9. What the event costs in wages ----------
create or replace function public.event_payroll(p_event uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare v jsonb;
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  select jsonb_build_object(
    'people', count(distinct es.id),
    'shifts', count(s.id),
    'hours',  coalesce(round(sum(public.shift_hours(s.id)), 2), 0),
    'total',  coalesce(sum(public.shift_amount(s.id)), 0)
  ) into v
  from public.event_staff es
  left join public.shifts s on s.staff_id = es.id
  where es.event_id = p_event and es.status <> 'removed';
  return v;
end; $$;
revoke all on function public.event_payroll(uuid) from public;
grant execute on function public.event_payroll(uuid) to authenticated;


-- ---------- 10. Sanity checks ----------
-- select id, code, name, status, join_token from public.events order by starts_on desc;
-- select public.event_roster('<event-uuid>');
-- select public.event_payroll('<event-uuid>');

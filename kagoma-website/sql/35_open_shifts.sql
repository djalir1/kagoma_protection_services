-- ============================================================
-- KAGOMA — Migration 33: Letting people know work exists
--
-- Until now an event reached a worker two ways: they were standing at
-- the gate with the QR in front of them, or a supervisor rang them.
-- Someone in the pool at home had no way to learn there was work.
--
--   Kagoma opens an event  ->  it appears on the work page
--   A worker taps "I am available"
--   The supervisor sees who put their hand up, and calls them
--
-- The supervisor still decides. Raising a hand is not a booking.
--
-- Run AFTER 01..34. Safe to re-run.
-- ============================================================

-- Stop early and say why, rather than fail on the first line that
-- touches a table that is not there.
do $$
begin
  if to_regclass('public.events') is null then
    raise exception 'public.events is missing. Run 32_event_staffing.sql first.';
  end if;
  if to_regclass('public.work_pool') is null then
    raise exception 'public.work_pool is missing. Run 33_talent_pool.sql first.';
  end if;
  if to_regclass('public.event_staff') is null then
    raise exception 'public.event_staff is missing. Run 32_event_staffing.sql first.';
  end if;
end $$;

alter table public.events add column if not exists publish boolean not null default false;
alter table public.events add column if not exists roles_wanted text[] not null default '{}';
alter table public.events add column if not exists public_note text;

comment on column public.events.publish is
  'false by default: a client event is not advertised unless Kagoma says so.';


-- ---------- 1. Who has put their hand up ----------
create table if not exists public.event_interest (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  pool_id uuid references public.work_pool(id) on delete cascade,
  full_name text not null,
  phone text not null,
  note text,
  status text not null default 'offered'
    check (status in ('offered','called','declined','withdrawn')),
  created_at timestamptz not null default now(),
  unique (event_id, phone)
);
create index if not exists interest_event_idx on public.event_interest(event_id, created_at);
alter table public.event_interest enable row level security;

drop policy if exists "interest_admin" on public.event_interest;
create policy "interest_admin" on public.event_interest
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 2. What a worker may see ----------
-- Deliberately thin: the event name, where, when and which roles.
-- Not the client's name, not the fee, not the staffing plan.
create or replace function public.open_shifts()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', e.id, 'name', e.name, 'venue', e.venue,
    'starts_on', e.starts_on, 'call_time', e.call_time,
    'roles', e.roles_wanted, 'note', e.public_note,
    'needed', e.staff_needed,
    'offered', (select count(*) from public.event_interest i where i.event_id = e.id)
  ) order by e.starts_on), '[]'::jsonb)
  from public.events e
  where e.publish = true
    and e.status in ('planned','open','running')
    and e.starts_on >= current_date - 1;
$$;
grant execute on function public.open_shifts() to anon, authenticated;


-- ---------- 3. Raising a hand ----------
create or replace function public.offer_availability(
  p_event uuid, p_phone text, p_name text default null, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e record; w record;
begin
  select * into e from public.events where id = p_event;
  if e is null or not e.publish or e.status not in ('planned','open','running') then
    return jsonb_build_object('ok', false, 'reason', 'not_open');
  end if;
  if btrim(coalesce(p_phone,'')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'need_phone');
  end if;

  -- the phone must already be in the pool: this is for people Kagoma
  -- knows, not a second front door onto an event
  select * into w from public.work_pool where lower(phone) = lower(btrim(p_phone));
  if w is null then
    return jsonb_build_object('ok', false, 'reason', 'not_registered');
  end if;
  if w.status in ('rejected','inactive') then
    return jsonb_build_object('ok', false, 'reason', 'not_available');
  end if;

  insert into public.event_interest (event_id, pool_id, full_name, phone, note)
  values (p_event, w.id, coalesce(nullif(btrim(coalesce(p_name,'')),''), w.full_name),
          btrim(p_phone), nullif(btrim(coalesce(p_note,'')),''))
  on conflict (event_id, phone) do update
    set status = 'offered', note = coalesce(excluded.note, public.event_interest.note);

  return jsonb_build_object('ok', true, 'name', w.full_name,
                            'screened', w.status = 'approved');
end; $$;
grant execute on function public.offer_availability(uuid,text,text,text) to anon, authenticated;


-- ---------- 4. What the supervisor sees ----------
create or replace function public.event_offers(p_event uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', i.id, 'pool_id', i.pool_id,
      'name', i.full_name, 'phone', i.phone,
      'note', i.note, 'status', i.status, 'offered_at', i.created_at,
      'pool_status', w.status,
      'roles', w.roles,
      'address', public.format_address(w.village, w.cell, w.sector, w.district, w.province),
      'events_worked', coalesce(w.events_worked, 0),
      -- already pulled onto the roster?
      'on_roster', exists (select 1 from public.event_staff es
                            where es.event_id = i.event_id and es.phone = i.phone)
    ) order by coalesce(w.events_worked,0) desc, i.created_at)
    from public.event_interest i
    left join public.work_pool w on w.id = i.pool_id
    where i.event_id = p_event and i.status <> 'withdrawn'
  ), '[]'::jsonb);
end; $$;
revoke all on function public.event_offers(uuid) from public;
grant execute on function public.event_offers(uuid) to authenticated;

-- Sanity checks
-- select public.open_shifts();
-- select id, name, publish, roles_wanted from public.events order by starts_on desc;

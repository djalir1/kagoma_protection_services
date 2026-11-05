-- ============================================================
-- KAGOMA — Migration 34: Where the gate worker lives
--
-- Someone who registers at the gate gave a name, a phone and an ID
-- and nothing else, so Kagoma could not call them for the next event.
-- Three more fields, two of them taps, and the person becomes
-- someone who can be reached again.
--
-- Run AFTER 01..35. Safe to re-run.
-- ============================================================

alter table public.event_staff add column if not exists province text;
alter table public.event_staff add column if not exists district text;
alter table public.event_staff add column if not exists sector   text;

create index if not exists estaff_place_idx on public.event_staff(district, sector);


create or replace function public.join_event(
  p_token text, p_name text, p_phone text,
  p_nid text default null, p_role text default null,
  p_province text default null, p_district text default null,
  p_sector text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e record; v_id uuid; v_person uuid; v_pool uuid;
begin
  select * into e from public.events where join_token = p_token;
  if e is null then return jsonb_build_object('ok', false, 'reason', 'unknown_event'); end if;
  if e.status not in ('open','running') then
    return jsonb_build_object('ok', false, 'reason', 'not_open');
  end if;
  if btrim(coalesce(p_name,'')) = '' or btrim(coalesce(p_phone,'')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'need_name_and_phone');
  end if;

  v_person := auth.uid();

  select id into v_id from public.event_staff
   where event_id = e.id and phone = btrim(p_phone);

  if v_id is not null then
    update public.event_staff
       set full_name = btrim(p_name),
           national_id = coalesce(nullif(btrim(coalesce(p_nid,'')),''), national_id),
           role = coalesce(nullif(btrim(coalesce(p_role,'')),''), role),
           province = coalesce(nullif(btrim(coalesce(p_province,'')),''), province),
           district = coalesce(nullif(btrim(coalesce(p_district,'')),''), district),
           sector   = coalesce(nullif(btrim(coalesce(p_sector,'')),''), sector),
           person_id = coalesce(person_id, v_person)
     where id = v_id;
  else
    insert into public.event_staff (
      event_id, person_id, full_name, phone, national_id, role,
      province, district, sector)
    values (e.id, v_person, btrim(p_name), btrim(p_phone),
            nullif(btrim(coalesce(p_nid,'')),''),
            coalesce(nullif(btrim(coalesce(p_role,'')),''), 'Steward'),
            nullif(btrim(coalesce(p_province,'')),''),
            nullif(btrim(coalesce(p_district,'')),''),
            nullif(btrim(coalesce(p_sector,'')),''))
    returning id into v_id;
  end if;

  -- Someone who turned up and worked is someone Kagoma should be able
  -- to call again. They land in the pool unscreened: turning up is not
  -- the same as being vetted, and only a screened person can be sent
  -- to a client.
  if to_regclass('public.work_pool') is not null then
    select id into v_pool from public.work_pool where lower(phone) = lower(btrim(p_phone));
    if v_pool is null then
      insert into public.work_pool (person_id, full_name, phone, national_id,
                                    province, district, sector, status)
      values (v_person, btrim(p_name), btrim(p_phone),
              nullif(btrim(coalesce(p_nid,'')),''),
              nullif(btrim(coalesce(p_province,'')),''),
              nullif(btrim(coalesce(p_district,'')),''),
              nullif(btrim(coalesce(p_sector,'')),''),
              'new');
    else
      update public.work_pool
         set province = coalesce(province, nullif(btrim(coalesce(p_province,'')),'')),
             district = coalesce(district, nullif(btrim(coalesce(p_district,'')),'')),
             sector   = coalesce(sector,   nullif(btrim(coalesce(p_sector,'')),''))
       where id = v_pool;
    end if;
  end if;

  return jsonb_build_object('ok', true,
    'already', v_id is not null, 'event', e.name);
end; $$;
grant execute on function public.join_event(text,text,text,text,text,text,text,text)
  to anon, authenticated;


-- the roster shows where each person came from
create or replace function public.event_roster(p_event uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'staff_id', es.id, 'name', es.full_name, 'phone', es.phone,
      'role', es.role, 'status', es.status,
      'place', nullif(concat_ws(', ', es.sector, es.district), ''),
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

-- Sanity check
-- select full_name, phone, district, sector from public.event_staff order by registered_at desc;

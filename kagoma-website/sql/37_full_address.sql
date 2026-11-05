-- ============================================================
-- KAGOMA — Migration 35: The address a venue asks for
--
-- KCC and venues like it require, for every officer on site:
--   national ID, names, phone, and the address in full —
--   province, district, sector, cell, village.
--
-- This is not paperwork for its own sake. A venue that lets a
-- person past its perimeter has to be able to say afterwards who
-- that person was.
--
-- Run AFTER 01..36. Safe to re-run.
-- ============================================================

alter table public.event_staff add column if not exists cell    text;
alter table public.event_staff add column if not exists village text;


create or replace function public.join_event(
  p_token text, p_name text, p_phone text,
  p_nid text default null, p_role text default null,
  p_province text default null, p_district text default null,
  p_sector text default null, p_cell text default null,
  p_village text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e record; v_id uuid; v_person uuid; v_pool uuid; v_existing boolean;
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
  v_existing := v_id is not null;

  if v_existing then
    update public.event_staff set
      full_name   = btrim(p_name),
      national_id = coalesce(nullif(btrim(coalesce(p_nid,'')),''), national_id),
      role        = coalesce(nullif(btrim(coalesce(p_role,'')),''), role),
      province    = coalesce(nullif(btrim(coalesce(p_province,'')),''), province),
      district    = coalesce(nullif(btrim(coalesce(p_district,'')),''), district),
      sector      = coalesce(nullif(btrim(coalesce(p_sector,'')),''), sector),
      cell        = coalesce(nullif(btrim(coalesce(p_cell,'')),''), cell),
      village     = coalesce(nullif(btrim(coalesce(p_village,'')),''), village),
      person_id   = coalesce(person_id, v_person)
    where id = v_id;
  else
    insert into public.event_staff (
      event_id, person_id, full_name, phone, national_id, role,
      province, district, sector, cell, village)
    values (e.id, v_person, btrim(p_name), btrim(p_phone),
            nullif(btrim(coalesce(p_nid,'')),''),
            coalesce(nullif(btrim(coalesce(p_role,'')),''), 'Steward'),
            nullif(btrim(coalesce(p_province,'')),''),
            nullif(btrim(coalesce(p_district,'')),''),
            nullif(btrim(coalesce(p_sector,'')),''),
            nullif(btrim(coalesce(p_cell,'')),''),
            nullif(btrim(coalesce(p_village,'')),''))
    returning id into v_id;
  end if;

  -- someone who worked once is someone Kagoma can call again
  if to_regclass('public.work_pool') is not null then
    select id into v_pool from public.work_pool where lower(phone) = lower(btrim(p_phone));
    if v_pool is null then
      insert into public.work_pool (person_id, full_name, phone, national_id,
                                    province, district, sector, cell, village, status)
      values (v_person, btrim(p_name), btrim(p_phone),
              nullif(btrim(coalesce(p_nid,'')),''),
              nullif(btrim(coalesce(p_province,'')),''),
              nullif(btrim(coalesce(p_district,'')),''),
              nullif(btrim(coalesce(p_sector,'')),''),
              nullif(btrim(coalesce(p_cell,'')),''),
              nullif(btrim(coalesce(p_village,'')),''),
              'new');
    else
      update public.work_pool set
        province = coalesce(province, nullif(btrim(coalesce(p_province,'')),'')),
        district = coalesce(district, nullif(btrim(coalesce(p_district,'')),'')),
        sector   = coalesce(sector,   nullif(btrim(coalesce(p_sector,'')),'')),
        cell     = coalesce(cell,     nullif(btrim(coalesce(p_cell,'')),'')),
        village  = coalesce(village,  nullif(btrim(coalesce(p_village,'')),''))
      where id = v_pool;
    end if;
  end if;

  return jsonb_build_object('ok', true, 'already', v_existing, 'event', e.name);
end; $$;
grant execute on function public.join_event(
  text,text,text,text,text,text,text,text,text,text) to anon, authenticated;


-- ---------- The list a venue asks for ----------
-- Handed to KCC or any venue before an event: exactly the columns
-- they ask for, in the order they ask for them, and a flag for
-- anyone whose record is not yet complete.
create or replace function public.event_manifest(p_event uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'no', row_number() over (order by es.full_name),
      'names', es.full_name,
      'id_number', es.national_id,
      'phone', es.phone,
      'province', es.province,
      'district', es.district,
      'sector', es.sector,
      'cell', es.cell,
      'village', es.village,
      'role', es.role,
      'complete', (es.national_id is not null and es.province is not null
                   and es.district is not null and es.sector is not null
                   and es.cell is not null and es.village is not null)
    ) order by es.full_name)
    from public.event_staff es
    where es.event_id = p_event and es.status <> 'removed'
  ), '[]'::jsonb);
end; $$;
revoke all on function public.event_manifest(uuid) from public;
grant execute on function public.event_manifest(uuid) to authenticated;

-- Sanity check
-- select public.event_manifest('<event-uuid>');

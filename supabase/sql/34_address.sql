-- ============================================================
-- KAGOMA — Migration 32: Addresses the Rwandan way
--
-- One "district" field cannot find a person. The administrative
-- hierarchy can:
--
--   Intara (Province) > Akarere (District) > Umurenge (Sector)
--   > Akagari (Cell) > Umudugudu (Village)
--
-- Applied to the work pool and to learner profiles, so both records
-- describe a place the same way.
--
-- Run AFTER 01..33. Safe to re-run.
-- ============================================================

-- ---------- 1. The work pool ----------
alter table public.work_pool add column if not exists province text;
alter table public.work_pool add column if not exists sector   text;
alter table public.work_pool add column if not exists cell     text;
alter table public.work_pool add column if not exists village  text;

create index if not exists pool_place_idx
  on public.work_pool(province, district, sector);

comment on column public.work_pool.village is
  'Umudugudu. The smallest unit, and the one that actually locates a person.';


-- ---------- 2. Learner profiles, same shape ----------
alter table public.profiles add column if not exists province text;
alter table public.profiles add column if not exists cell     text;
alter table public.profiles add column if not exists village  text;
-- district and sector already exist from migration 17

create index if not exists profiles_place_idx
  on public.profiles(province, district, sector);


-- ---------- 3. One line, written the way it is spoken ----------
-- Rwandan addresses are read from the smallest unit up, so that is
-- how they are assembled for a document or a call sheet.
create or replace function public.format_address(
  p_village text, p_cell text, p_sector text, p_district text, p_province text
) returns text
language sql immutable as $$
  select nullif(array_to_string(
    array_remove(array[
      nullif(btrim(coalesce(p_village,'')),''),
      nullif(btrim(coalesce(p_cell,'')),''),
      nullif(btrim(coalesce(p_sector,'')),''),
      nullif(btrim(coalesce(p_district,'')),''),
      nullif(btrim(coalesce(p_province,'')),'')
    ], null), ', '), '');
$$;
grant execute on function public.format_address(text,text,text,text,text) to anon, authenticated;


-- ---------- 4. Registering, with the full address ----------
create or replace function public.join_work_pool(
  p_name text, p_phone text, p_email text default null,
  p_nid text default null, p_dob date default null,
  p_gender text default null, p_district text default null,
  p_roles text[] default '{}', p_years numeric default null,
  p_note text default null, p_languages text[] default '{}',
  p_weekdays boolean default true, p_weekends boolean default true,
  p_nights boolean default false, p_transport boolean default false,
  p_province text default null, p_sector text default null,
  p_cell text default null, p_village text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_age int;
begin
  if btrim(coalesce(p_name,'')) = '' or btrim(coalesce(p_phone,'')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'need_name_and_phone');
  end if;

  if p_dob is not null then
    v_age := extract(year from age(current_date, p_dob));
    if v_age < 18 then
      return jsonb_build_object('ok', false, 'reason', 'underage');
    end if;
  end if;

  select id into v_id from public.work_pool where lower(phone) = lower(btrim(p_phone));

  if v_id is not null then
    update public.work_pool set
      full_name = btrim(p_name),
      email = coalesce(nullif(btrim(coalesce(p_email,'')),''), email),
      national_id = coalesce(nullif(btrim(coalesce(p_nid,'')),''), national_id),
      date_of_birth = coalesce(p_dob, date_of_birth),
      gender = coalesce(p_gender, gender),
      province = coalesce(nullif(btrim(coalesce(p_province,'')),''), province),
      district = coalesce(nullif(btrim(coalesce(p_district,'')),''), district),
      sector   = coalesce(nullif(btrim(coalesce(p_sector,'')),''), sector),
      cell     = coalesce(nullif(btrim(coalesce(p_cell,'')),''), cell),
      village  = coalesce(nullif(btrim(coalesce(p_village,'')),''), village),
      roles = case when array_length(p_roles,1) is null then roles else p_roles end,
      experience_years = coalesce(p_years, experience_years),
      experience_note = coalesce(nullif(btrim(coalesce(p_note,'')),''), experience_note),
      languages = case when array_length(p_languages,1) is null then languages else p_languages end,
      available_weekdays = p_weekdays, available_weekends = p_weekends,
      available_nights = p_nights, has_own_transport = p_transport,
      person_id = coalesce(person_id, auth.uid())
    where id = v_id;
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  insert into public.work_pool (
    person_id, full_name, phone, email, national_id, date_of_birth, gender,
    province, district, sector, cell, village,
    roles, experience_years, experience_note, languages,
    available_weekdays, available_weekends, available_nights, has_own_transport)
  values (
    auth.uid(), btrim(p_name), btrim(p_phone),
    nullif(btrim(coalesce(p_email,'')),''),
    nullif(btrim(coalesce(p_nid,'')),''), p_dob, p_gender,
    nullif(btrim(coalesce(p_province,'')),''),
    nullif(btrim(coalesce(p_district,'')),''),
    nullif(btrim(coalesce(p_sector,'')),''),
    nullif(btrim(coalesce(p_cell,'')),''),
    nullif(btrim(coalesce(p_village,'')),''),
    coalesce(p_roles,'{}'), p_years,
    nullif(btrim(coalesce(p_note,'')),''), coalesce(p_languages,'{}'),
    p_weekdays, p_weekends, p_nights, p_transport)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'already', false);
end; $$;
grant execute on function public.join_work_pool(
  text,text,text,text,date,text,text,text[],numeric,text,text[],
  boolean,boolean,boolean,boolean,text,text,text,text) to anon, authenticated;


-- ---------- 5. The search returns the address that finds someone ----------
create or replace function public.search_pool(
  p_role text default null, p_district text default null,
  p_status text default 'approved', p_query text default null
) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', w.id, 'name', w.full_name, 'phone', w.phone,
      'national_id', w.national_id,
      'address', public.format_address(w.village, w.cell, w.sector, w.district, w.province),
      'district', w.district, 'sector', w.sector,
      'roles', w.roles, 'years', w.experience_years,
      'experience', w.experience_note, 'status', w.status,
      'weekends', w.available_weekends, 'nights', w.available_nights,
      'transport', w.has_own_transport,
      'events_worked', w.events_worked, 'last_worked', w.last_worked_on,
      'certificates', (select count(*) from public.certificates c
                        where c.student_id = w.person_id and c.status = 'valid')
    ) order by w.events_worked desc, w.full_name)
    from public.work_pool w
    where (p_status is null or w.status = p_status)
      and (p_role is null or p_role = any(w.roles))
      and (p_district is null or w.district ilike '%'||p_district||'%')
      and (p_query is null or w.full_name ilike '%'||p_query||'%'
           or w.phone ilike '%'||p_query||'%'
           or w.national_id ilike '%'||p_query||'%')
  ), '[]'::jsonb);
end; $$;
revoke all on function public.search_pool(text,text,text,text) from public;
grant execute on function public.search_pool(text,text,text,text) to authenticated;

-- Sanity checks
-- select full_name, public.format_address(village,cell,sector,district,province) from public.work_pool;

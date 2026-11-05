-- ============================================================
-- KAGOMA — Migration 31: The standing roster
--
-- Until now the only way onto an event was to scan the QR at the
-- gate, which means Kagoma can only staff an event with whoever
-- happens to turn up. An event three weeks out needing 24 stewards
-- has to be called, and calling needs a list.
--
--   Long lead time  ->  the pool  ->  call the people you want
--   On the day      ->  the QR    ->  walk-ups register themselves
--
-- Both end on the same event roster.
--
-- Run AFTER 01..32. Safe to re-run.
-- ============================================================

create table if not exists public.work_pool (
  id uuid primary key default gen_random_uuid(),
  person_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  phone text not null,
  email text,
  national_id text,
  date_of_birth date,
  gender text check (gender is null or gender in ('male','female','undisclosed')),
  district text,
  sector text,
  roles text[] not null default '{}',        -- Steward, Usher, Accreditation…
  experience_years numeric(4,1),
  experience_note text,
  languages text[] not null default '{}',
  available_weekdays boolean not null default true,
  available_weekends boolean not null default true,
  available_nights boolean not null default false,
  has_own_transport boolean not null default false,
  status text not null default 'new'
    check (status in ('new','screened','approved','standby','rejected','inactive')),
  screening_note text,
  screened_by uuid references public.profiles(id),
  screened_on timestamptz,
  last_worked_on date,
  events_worked int not null default 0,
  created_at timestamptz not null default now()
);

-- one person, one entry: a phone number is how they are called
create unique index if not exists work_pool_phone_uniq on public.work_pool(lower(phone));
create unique index if not exists work_pool_nid_uniq
  on public.work_pool(national_id) where national_id is not null;
create index if not exists work_pool_status_idx on public.work_pool(status);
create index if not exists work_pool_roles_idx on public.work_pool using gin(roles);

alter table public.work_pool enable row level security;

drop policy if exists "pool_admin" on public.work_pool;
create policy "pool_admin" on public.work_pool
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "pool_own_read" on public.work_pool;
create policy "pool_own_read" on public.work_pool
  for select using (public.is_admin() or auth.uid() = person_id);


-- ---------- 1. Registering interest ----------
-- Open to anyone, signed in or not: the person applying for casual
-- work has no reason to hold an account yet.
create or replace function public.join_work_pool(
  p_name text, p_phone text, p_email text default null,
  p_nid text default null, p_dob date default null,
  p_gender text default null, p_district text default null,
  p_roles text[] default '{}', p_years numeric default null,
  p_note text default null, p_languages text[] default '{}',
  p_weekdays boolean default true, p_weekends boolean default true,
  p_nights boolean default false, p_transport boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_age int;
begin
  if btrim(coalesce(p_name,'')) = '' or btrim(coalesce(p_phone,'')) = '' then
    return jsonb_build_object('ok', false, 'reason', 'need_name_and_phone');
  end if;

  -- security work is adult work; the gate is here as well as at signup
  if p_dob is not null then
    v_age := extract(year from age(current_date, p_dob));
    if v_age < 18 then
      return jsonb_build_object('ok', false, 'reason', 'underage');
    end if;
  end if;

  select id into v_id from public.work_pool where lower(phone) = lower(btrim(p_phone));

  if v_id is not null then
    -- someone updating their details, not a second person
    update public.work_pool set
      full_name = btrim(p_name),
      email = coalesce(nullif(btrim(coalesce(p_email,'')),''), email),
      national_id = coalesce(nullif(btrim(coalesce(p_nid,'')),''), national_id),
      date_of_birth = coalesce(p_dob, date_of_birth),
      gender = coalesce(p_gender, gender),
      district = coalesce(nullif(btrim(coalesce(p_district,'')),''), district),
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
    district, roles, experience_years, experience_note, languages,
    available_weekdays, available_weekends, available_nights, has_own_transport)
  values (
    auth.uid(), btrim(p_name), btrim(p_phone),
    nullif(btrim(coalesce(p_email,'')),''),
    nullif(btrim(coalesce(p_nid,'')),''), p_dob, p_gender,
    nullif(btrim(coalesce(p_district,'')),''),
    coalesce(p_roles,'{}'), p_years,
    nullif(btrim(coalesce(p_note,'')),''), coalesce(p_languages,'{}'),
    p_weekdays, p_weekends, p_nights, p_transport)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'already', false);
end; $$;
grant execute on function public.join_work_pool(
  text,text,text,text,date,text,text,text[],numeric,text,text[],
  boolean,boolean,boolean,boolean) to anon, authenticated;


-- ---------- 2. Screening ----------
create or replace function public.screen_pool_entry(
  p_id uuid, p_status text, p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  if p_status not in ('new','screened','approved','standby','rejected','inactive') then
    raise exception 'Unknown status';
  end if;
  update public.work_pool
     set status = p_status, screening_note = coalesce(p_note, screening_note),
         screened_by = auth.uid(), screened_on = now()
   where id = p_id;
end; $$;
revoke all on function public.screen_pool_entry(uuid,text,text) from public;
grant execute on function public.screen_pool_entry(uuid,text,text) to authenticated;


-- ---------- 3. Finding the right people ----------
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
      'district', w.district, 'roles', w.roles,
      'years', w.experience_years, 'status', w.status,
      'weekends', w.available_weekends, 'nights', w.available_nights,
      'transport', w.has_own_transport,
      'events_worked', w.events_worked, 'last_worked', w.last_worked_on,
      -- what they have earned from Kagoma itself
      'certificates', (select count(*) from public.certificates c
                        where c.student_id = w.person_id and c.status = 'valid')
    ) order by w.events_worked desc, w.full_name)
    from public.work_pool w
    where (p_status is null or w.status = p_status)
      and (p_role is null or p_role = any(w.roles))
      and (p_district is null or w.district ilike '%'||p_district||'%')
      and (p_query is null or w.full_name ilike '%'||p_query||'%'
           or w.phone ilike '%'||p_query||'%')
  ), '[]'::jsonb);
end; $$;
revoke all on function public.search_pool(text,text,text,text) from public;
grant execute on function public.search_pool(text,text,text,text) to authenticated;


-- ---------- 4. Calling someone onto an event ----------
create or replace function public.call_to_event(p_event uuid, p_pool_id uuid, p_role text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare w record; v_id uuid;
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;

  select * into w from public.work_pool where id = p_pool_id;
  if w is null then return jsonb_build_object('ok', false, 'reason', 'not_found'); end if;
  if w.status not in ('approved','standby') then
    return jsonb_build_object('ok', false, 'reason', 'not_approved');
  end if;

  -- the QR may already have brought them in; do not double them
  select id into v_id from public.event_staff
   where event_id = p_event and phone = w.phone;
  if v_id is not null then
    return jsonb_build_object('ok', true, 'already', true, 'name', w.full_name);
  end if;

  insert into public.event_staff (event_id, person_id, full_name, phone, national_id, role, status)
  values (p_event, w.person_id, w.full_name, w.phone, w.national_id,
          coalesce(p_role, w.roles[1], 'Steward'), 'registered');

  return jsonb_build_object('ok', true, 'already', false, 'name', w.full_name);
end; $$;
revoke all on function public.call_to_event(uuid,uuid,text) from public;
grant execute on function public.call_to_event(uuid,uuid,text) to authenticated;


-- ---------- 5. A record of who actually works ----------
-- Counting events worked is what makes the pool useful a year from now:
-- the people who keep turning up rise to the top of every search.
create or replace function public.trg_count_event_worked()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_phone text; v_date date;
begin
  if new.clock_out is null then return new; end if;
  if tg_op = 'UPDATE' and old.clock_out is not null then return new; end if;

  select es.phone, e.starts_on into v_phone, v_date
  from public.event_staff es join public.events e on e.id = es.event_id
  where es.id = new.staff_id;

  if v_phone is null then return new; end if;

  update public.work_pool
     set events_worked = events_worked + 1,
         last_worked_on = greatest(coalesce(last_worked_on, v_date), v_date)
   where lower(phone) = lower(v_phone);

  return new;
end; $$;

drop trigger if exists trg_count_event_worked on public.shifts;
create trigger trg_count_event_worked
after insert or update on public.shifts
for each row execute function public.trg_count_event_worked();


-- ---------- 6. What the desk sees at a glance ----------
create or replace function public.pool_summary()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  return jsonb_build_object(
    'total',    (select count(*) from public.work_pool),
    'new',      (select count(*) from public.work_pool where status = 'new'),
    'approved', (select count(*) from public.work_pool where status = 'approved'),
    'worked',   (select count(*) from public.work_pool where events_worked > 0));
end; $$;
revoke all on function public.pool_summary() from public;
grant execute on function public.pool_summary() to authenticated;


-- ---------- 7. Sanity checks ----------
-- select status, count(*) from public.work_pool group by status;
-- select public.search_pool(null, null, 'approved', null);

-- ============================================================
-- KAGOMA — Migration 15: Gender and country on the learner record
--
-- Training providers in Rwanda report on gender parity and on where
-- their learners come from. This records both at signup and gives
-- the admin desk the percentages.
--
-- Run AFTER 01..16. Safe to re-run.
-- ============================================================

alter table public.profiles add column if not exists gender text
  check (gender is null or gender in ('male','female','undisclosed'));
alter table public.profiles add column if not exists country_code text;   -- ISO 3166-1 alpha-2
alter table public.profiles add column if not exists country_name text;

comment on column public.profiles.gender is
  'male | female | undisclosed. Kept optional so nobody is forced to answer.';
comment on column public.profiles.country_code is 'ISO 3166-1 alpha-2, e.g. RW';

create index if not exists profiles_gender_idx  on public.profiles(gender);
create index if not exists profiles_country_idx on public.profiles(country_code);


-- ---------- Carry the answers through from signup ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare requested_role text; g text;
begin
  requested_role := coalesce(new.raw_user_meta_data->>'role', 'student');
  if requested_role not in ('student','professional','employer','client') then
    requested_role := 'student';
  end if;

  g := new.raw_user_meta_data->>'gender';
  if g is not null and g not in ('male','female','undisclosed') then g := null; end if;

  insert into public.profiles (id, full_name, role, gender, country_code, country_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    requested_role,
    g,
    nullif(upper(coalesce(new.raw_user_meta_data->>'country_code','')),''),
    nullif(new.raw_user_meta_data->>'country_name','')
  );

  if requested_role = 'professional' then
    insert into public.professional_profiles (id) values (new.id)
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;


-- ---------- The numbers the desk needs ----------
create or replace function public.admin_demographics()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_total int;
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;

  -- individuals only: an employer or a client is an organisation
  select count(*) into v_total from public.profiles
   where role in ('student','professional');

  return jsonb_build_object(
    'total', v_total,
    'gender', coalesce((
      select jsonb_agg(jsonb_build_object(
               'key', coalesce(gender,'unknown'),
               'n', n,
               'pct', case when v_total = 0 then 0
                           else round(n::numeric*100/v_total, 1) end)
             order by n desc)
      from (select gender, count(*) n from public.profiles
             where role in ('student','professional')
             group by gender) s
    ), '[]'::jsonb),
    'countries', coalesce((
      select jsonb_agg(jsonb_build_object(
               'code', coalesce(country_code,'--'),
               'name', coalesce(country_name,'Unknown'),
               'n', n,
               'pct', case when v_total = 0 then 0
                           else round(n::numeric*100/v_total, 1) end)
             order by n desc)
      from (select country_code, country_name, count(*) n
              from public.profiles
             where role in ('student','professional')
             group by country_code, country_name) c
    ), '[]'::jsonb)
  );
end; $$;
revoke all on function public.admin_demographics() from public;
grant execute on function public.admin_demographics() to authenticated;


-- ---------- Sanity checks ----------
-- select public.admin_demographics();
-- select gender, count(*) from public.profiles group by gender;

-- ============================================================
-- KAGOMA — Migration 47: The /admin dashboard
--
-- The React dashboard at /admin edits every table directly. The
-- earlier migrations grant admins what each desk needs; this one
-- gives an administrator full create/read/update/delete on every
-- table in public, and a helper that tells the dashboard which
-- columns each table has so it can draw its forms.
--
-- Run AFTER 01..46. Safe to re-run.
-- ============================================================

-- ---------- 1. Full CRUD for administrators on every table ----------
do $$
declare t record;
begin
  for t in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t.relname);
    execute format('drop policy if exists "admin_full_access" on public.%I', t.relname);
    execute format(
      'create policy "admin_full_access" on public.%I for all to authenticated
         using (public.is_admin()) with check (public.is_admin())', t.relname);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t.relname);
  end loop;
end $$;


-- ---------- 2. Which tables and columns exist (admins only) ----------
create or replace function public.admin_table_columns()
returns table (
  table_name text, column_name text, data_type text,
  is_nullable boolean, has_default boolean, is_primary boolean, ordinal int
)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only an administrator'; end if;
  return query
    select c.table_name::text, c.column_name::text, c.data_type::text,
           (c.is_nullable = 'YES'), (c.column_default is not null),
           exists (
             select 1 from information_schema.table_constraints tc
             join information_schema.key_column_usage k
               on k.constraint_name = tc.constraint_name
              and k.table_schema = tc.table_schema
              and k.table_name = tc.table_name
             where tc.constraint_type = 'PRIMARY KEY'
               and tc.table_schema = 'public'
               and tc.table_name = c.table_name
               and k.column_name = c.column_name),
           c.ordinal_position::int
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public' and t.table_type = 'BASE TABLE'
    order by c.table_name, c.ordinal_position;
end; $$;
revoke all on function public.admin_table_columns() from public, anon;
grant execute on function public.admin_table_columns() to authenticated;


-- ---------- 3. Row counts for the overview (admins only) ----------
create or replace function public.admin_table_counts()
returns table (table_name text, row_count bigint)
language plpgsql stable security definer set search_path = public as $$
declare t record; n bigint;
begin
  if not public.is_admin() then raise exception 'Only an administrator'; end if;
  for t in
    select c.relname from pg_class c join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relkind = 'r' order by c.relname
  loop
    execute format('select count(*) from public.%I', t.relname) into n;
    table_name := t.relname; row_count := n; return next;
  end loop;
end; $$;
revoke all on function public.admin_table_counts() from public, anon;
grant execute on function public.admin_table_counts() to authenticated;


-- ---------- 4. The first administrator ----------
-- Create the login in Supabase > Authentication > Users > Add user
-- (tick "Auto Confirm User"), then run this to make it an admin.
update public.profiles set role = 'admin', vetting_status = 'approved'
where id = (select id from auth.users where lower(email) = 'shemaabdul20@gmail.com');

notify pgrst, 'reload schema';

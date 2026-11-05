-- ============================================================
-- KAGOMA — Migration 8: Client service pipeline + Admin overview
--
--   Request -> Risk Assessment -> Quotation -> Approval
--           -> Deployment -> Report
--
-- Run AFTER 01..09. Safe to re-run.
-- ============================================================

-- ---------- 1. Replace the flat status with the real pipeline ----------
alter table public.service_requests drop constraint if exists service_requests_status_check;

update public.service_requests set status = 'requested'  where status = 'new';
update public.service_requests set status = 'assessment' where status = 'reviewing';
update public.service_requests set status = 'quotation'  where status = 'quoted';
update public.service_requests set status = 'approved'   where status = 'confirmed';
update public.service_requests set status = 'reported'   where status in ('completed','closed');

alter table public.service_requests add constraint service_requests_status_check
  check (status in ('requested','assessment','quotation','approved','deployment','reported','cancelled'));

alter table public.service_requests alter column status set default 'requested';

alter table public.service_requests add column if not exists service_type text;
alter table public.service_requests add column if not exists requirements text;
alter table public.service_requests add column if not exists reference text;
alter table public.service_requests add column if not exists updated_at timestamptz not null default now();

create sequence if not exists public.service_ref_seq start 1;
create or replace function public.next_service_reference()
returns text language sql volatile as $$
  select 'KPS-SR-' || to_char(now(),'YYYY') || '-' ||
         lpad(nextval('public.service_ref_seq')::text, 5, '0');
$$;
update public.service_requests set reference = public.next_service_reference() where reference is null;
create unique index if not exists service_requests_ref_uniq
  on public.service_requests(reference) where reference is not null;


-- ---------- 2. Pipeline stage history (what the client sees) ----------
create table if not exists public.service_stages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  stage text not null
    check (stage in ('requested','assessment','quotation','approved','deployment','reported','cancelled')),
  note text,
  note_rw text,
  actor uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists service_stages_req_idx on public.service_stages(request_id, created_at);
alter table public.service_stages enable row level security;

-- The client who raised the request may follow it; staff see everything.
drop policy if exists "service_stages_read" on public.service_stages;
create policy "service_stages_read" on public.service_stages
  for select using (
    public.is_admin()
    or exists (select 1 from public.service_requests r
               where r.id = request_id and r.requested_by = auth.uid())
  );
drop policy if exists "service_stages_admin" on public.service_stages;
create policy "service_stages_admin" on public.service_stages
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 3. Advance the pipeline (staff only, writes history) ----------
create or replace function public.advance_service_request(
  p_request uuid, p_stage text, p_note text default null
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only staff may move a request'; end if;
  if p_stage not in ('requested','assessment','quotation','approved',
                     'deployment','reported','cancelled') then
    raise exception 'Unknown stage';
  end if;

  update public.service_requests
     set status = p_stage, updated_at = now()
   where id = p_request;

  insert into public.service_stages (request_id, stage, note, actor)
  values (p_request, p_stage, p_note, auth.uid());
end; $$;
revoke all on function public.advance_service_request(uuid,text,text) from public;
grant execute on function public.advance_service_request(uuid,text,text) to authenticated;

-- Record the opening stage automatically.
create or replace function public.trg_service_opened()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.service_stages (request_id, stage, actor)
  values (new.id, coalesce(new.status,'requested'), new.requested_by);
  return new;
end; $$;
drop trigger if exists trg_service_open on public.service_requests;
create trigger trg_service_open
after insert on public.service_requests
for each row execute function public.trg_service_opened();


-- ---------- 4. Quotations ----------
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  officers int,
  days int,
  currency text not null default 'RWF',
  amount numeric(14,2),
  valid_until date,
  notes text,
  status text not null default 'sent' check (status in ('sent','accepted','declined','expired')),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists quotations_req_idx on public.quotations(request_id);
alter table public.quotations enable row level security;

drop policy if exists "quotations_read" on public.quotations;
create policy "quotations_read" on public.quotations
  for select using (
    public.is_admin()
    or exists (select 1 from public.service_requests r
               where r.id = request_id and r.requested_by = auth.uid())
  );
drop policy if exists "quotations_admin" on public.quotations;
create policy "quotations_admin" on public.quotations
  for all using (public.is_admin()) with check (public.is_admin());
-- The client may accept or decline their own quotation.
drop policy if exists "quotations_client_answer" on public.quotations;
create policy "quotations_client_answer" on public.quotations
  for update using (
    exists (select 1 from public.service_requests r
            where r.id = request_id and r.requested_by = auth.uid())
  );


-- ---------- 5. Admin overview ----------
create or replace function public.admin_overview()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;

  return jsonb_build_object(
    'students',        (select count(*) from public.profiles where role = 'student'),
    'professionals',   (select count(*) from public.profiles where role = 'professional'),
    'employers',       (select count(*) from public.profiles where role = 'employer'),
    'clients',         (select count(distinct requested_by) from public.service_requests
                          where requested_by is not null),
    'active_courses',  (select count(*) from public.courses),
    'certificates',    (select count(*) from public.certificates where status = 'valid'),
    'service_requests',(select count(*) from public.service_requests
                          where status not in ('reported','cancelled')),
    'open_jobs',       (select count(*) from public.jobs where status = 'open'),
    'pipeline',        (select coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
                          from (select status, count(*) n
                                  from public.service_requests group by status) s)
  );
end; $$;
revoke all on function public.admin_overview() from public;
grant execute on function public.admin_overview() to authenticated;


-- ---------- 6. Sanity checks ----------
-- select public.admin_overview();
-- select reference, status from public.service_requests order by created_at desc limit 5;

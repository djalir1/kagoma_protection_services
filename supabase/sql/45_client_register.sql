-- ============================================================
-- KAGOMA — Migration 43: A register of clients and what they signed
--
-- The office can now produce a Master Service Agreement and a Service
-- Order. Nothing yet records which client has signed which, so nobody
-- can answer the question that matters on the day of an event:
--
--   "Does this client have a signed agreement, and what did we agree?"
--
-- Run AFTER 01..44. Safe to re-run.
-- ============================================================

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  trading_name text,
  tin text,
  address text,
  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create unique index if not exists clients_name_uniq on public.clients(lower(legal_name));
alter table public.clients enable row level security;
drop policy if exists "clients_staff" on public.clients;
create policy "clients_staff" on public.clients
  for all using (public.is_staff()) with check (public.is_staff());


-- ---------- The master agreement with that client ----------
create table if not exists public.agreements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  reference text unique not null,           -- KPS-MSA-2026-0001
  document_id uuid references public.documents(id) on delete set null,
  starts_on date,
  status text not null default 'draft'
    check (status in ('draft','sent','signed','expired','terminated')),
  signed_on date,
  signed_by_client text,                    -- who signed for the client
  signed_for_kagoma uuid references public.profiles(id),
  terminated_on date,
  termination_note text,
  created_at timestamptz not null default now()
);
create index if not exists agreements_client_idx on public.agreements(client_id, status);
alter table public.agreements enable row level security;
drop policy if exists "agreements_staff" on public.agreements;
create policy "agreements_staff" on public.agreements
  for all using (public.is_staff()) with check (public.is_staff());


-- ---------- One job under that agreement ----------
create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid references public.agreements(id) on delete set null,
  client_id uuid not null references public.clients(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  reference text unique not null,           -- KPS-SO-2026-0007
  document_id uuid references public.documents(id) on delete set null,
  event_name text,
  venue text,
  event_date date,
  staff_count int,
  total_rwf numeric(12,2),
  deposit_rwf numeric(12,2),
  status text not null default 'draft'
    check (status in ('draft','sent','approved','delivered','invoiced','paid','cancelled')),
  approved_on date,
  created_at timestamptz not null default now()
);
create index if not exists so_client_idx on public.service_orders(client_id, event_date desc);
alter table public.service_orders enable row level security;
drop policy if exists "so_staff" on public.service_orders;
create policy "so_staff" on public.service_orders
  for all using (public.is_staff()) with check (public.is_staff());


-- ---------- 1. The question the office has to answer ----------
-- A Service Order without a signed master agreement behind it means
-- Kagoma is working on terms nobody agreed. The desk should be able to
-- see that before the event, not after a dispute.
create or replace function public.client_register()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id,
      'name', c.legal_name,
      'tin', c.tin,
      'contact', nullif(concat_ws(' \u00b7 ', c.contact_name, c.contact_phone), ''),
      'agreement', (select jsonb_build_object(
                      'ref', a.reference, 'status', a.status,
                      'signed_on', a.signed_on, 'starts_on', a.starts_on)
                    from public.agreements a
                    where a.client_id = c.id
                    order by (a.status = 'signed') desc, a.created_at desc limit 1),
      'orders', (select count(*) from public.service_orders s where s.client_id = c.id),
      'orders_unsigned', (select count(*) from public.service_orders s
                           where s.client_id = c.id
                             and not exists (select 1 from public.agreements a
                                              where a.id = s.agreement_id and a.status = 'signed')),
      'last_event', (select max(s.event_date) from public.service_orders s where s.client_id = c.id),
      'billed', (select coalesce(sum(s.total_rwf),0) from public.service_orders s
                  where s.client_id = c.id and s.status in ('delivered','invoiced','paid'))
    ) order by c.legal_name)
    from public.clients c
  ), '[]'::jsonb);
end; $$;
revoke all on function public.client_register() from public;
grant execute on function public.client_register() to authenticated;


-- ---------- 2. Recording what was signed ----------
create or replace function public.record_agreement(
  p_client uuid, p_reference text, p_starts date default null,
  p_status text default 'draft', p_signed_on date default null,
  p_signed_by text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  if p_status not in ('draft','sent','signed','expired','terminated') then
    return jsonb_build_object('ok', false, 'reason', 'bad_status');
  end if;
  -- a signed agreement has a date; without one "signed" is a claim
  if p_status = 'signed' and p_signed_on is null then
    return jsonb_build_object('ok', false, 'reason', 'need_signed_date');
  end if;

  insert into public.agreements (client_id, reference, starts_on, status,
                                 signed_on, signed_by_client, signed_for_kagoma)
  values (p_client, btrim(p_reference), p_starts, p_status,
          p_signed_on, nullif(btrim(coalesce(p_signed_by,'')),''), auth.uid())
  on conflict (reference) do update
    set status = excluded.status,
        signed_on = coalesce(excluded.signed_on, public.agreements.signed_on),
        signed_by_client = coalesce(excluded.signed_by_client, public.agreements.signed_by_client),
        starts_on = coalesce(excluded.starts_on, public.agreements.starts_on)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end; $$;
revoke all on function public.record_agreement(uuid,text,date,text,date,text) from public;
grant execute on function public.record_agreement(uuid,text,date,text,date,text) to authenticated;


-- ---------- 3. Recording a job ----------
create or replace function public.record_service_order(
  p_client uuid, p_reference text, p_agreement text default null,
  p_event_name text default null, p_venue text default null,
  p_date date default null, p_staff int default null,
  p_total numeric default null, p_deposit numeric default null,
  p_status text default 'draft'
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_agr uuid; v_id uuid; v_signed boolean := false;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;

  if p_agreement is not null then
    select id, status = 'signed' into v_agr, v_signed
      from public.agreements where reference = btrim(p_agreement);
  end if;

  insert into public.service_orders (
    client_id, agreement_id, reference, event_name, venue, event_date,
    staff_count, total_rwf, deposit_rwf, status)
  values (p_client, v_agr, btrim(p_reference),
          nullif(btrim(coalesce(p_event_name,'')),''),
          nullif(btrim(coalesce(p_venue,'')),''),
          p_date, p_staff, p_total, p_deposit, p_status)
  on conflict (reference) do update
    set agreement_id = coalesce(excluded.agreement_id, public.service_orders.agreement_id),
        event_name = coalesce(excluded.event_name, public.service_orders.event_name),
        venue = coalesce(excluded.venue, public.service_orders.venue),
        event_date = coalesce(excluded.event_date, public.service_orders.event_date),
        staff_count = coalesce(excluded.staff_count, public.service_orders.staff_count),
        total_rwf = coalesce(excluded.total_rwf, public.service_orders.total_rwf),
        deposit_rwf = coalesce(excluded.deposit_rwf, public.service_orders.deposit_rwf),
        status = excluded.status
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id,
    'warning', case when not v_signed
      then 'No signed master agreement is on file for this client.'
      else null end);
end; $$;
revoke all on function public.record_service_order(
  uuid,text,text,text,text,date,int,numeric,numeric,text) from public;
grant execute on function public.record_service_order(
  uuid,text,text,text,text,date,int,numeric,numeric,text) to authenticated;

-- Sanity checks
-- select public.client_register();
-- select legal_name, tin from public.clients order by legal_name;

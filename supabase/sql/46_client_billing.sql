-- ============================================================
-- KAGOMA — Migration 44: What the client owes, and what they paid
--
-- The register knows a Service Order is worth 2,124,000 RWF and that
-- a deposit of 1,062,000 was agreed. It has nowhere to record that the
-- deposit arrived. Three clauses of the Master Service Agreement rest
-- on knowing:
--
--   Ingingo 12  the fee is invoiced and paid by the date on the invoice
--   Ingingo 13  Kagoma may require a deposit before starting
--   Ingingo 14  persistent non-payment may suspend the service
--
-- And two more create charges after the event is over:
--
--   Ingingo 11  overtime, early start, late finish, waiting time caused
--               by the client, extra staff at the client's request
--   Ingingo 19  damage to Kagoma equipment
--
-- A supervisor at a gate should be able to see, before the doors open,
-- whether this job is cleared to run.
--
-- Run AFTER 01..45. Safe to re-run.
-- ============================================================

-- Stop with a sentence rather than fail on the first line that calls
-- something that is not there yet.
do $$
begin
  if to_regproc('public.is_staff') is null then
    raise exception 'public.is_staff() is missing. Run 40_staff_access.sql first.';
  end if;
  if to_regclass('public.service_orders') is null then
    raise exception 'public.service_orders is missing. Run 45_client_register.sql first.';
  end if;
  raise notice 'Dependencies found. Continuing.';
end $$;

-- ---------- 1. Charges added after the order was priced ----------
create table if not exists public.so_charges (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  kind text not null check (kind in
    ('overtime','early_start','late_finish','waiting','extra_staff','equipment','other')),
  description text,
  hours numeric(6,2),
  rate_rwf numeric(12,2),
  amount_rwf numeric(12,2) not null check (amount_rwf >= 0),
  -- Ingingo 16: a change is not agreed until it is confirmed in writing
  agreed_by_client boolean not null default false,
  agreed_note text,
  added_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists so_charges_order_idx on public.so_charges(service_order_id);
alter table public.so_charges enable row level security;
drop policy if exists "so_charges_staff" on public.so_charges;
create policy "so_charges_staff" on public.so_charges
  for all using (public.is_staff()) with check (public.is_staff());


-- ---------- 2. What the client has actually paid ----------
create table if not exists public.client_payments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  purpose text not null default 'balance'
    check (purpose in ('deposit','balance','extra','refund')),
  amount_rwf numeric(12,2) not null check (amount_rwf <> 0),
  method text check (method in ('momo','bank','cash','cheque','other')),
  reference text,
  received_on date not null default current_date,
  note text,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists client_pay_order_idx on public.client_payments(service_order_id);
create index if not exists client_pay_client_idx on public.client_payments(client_id, received_on desc);
alter table public.client_payments enable row level security;
drop policy if exists "client_pay_staff" on public.client_payments;
create policy "client_pay_staff" on public.client_payments
  for all using (public.is_staff()) with check (public.is_staff());


-- ---------- 3. Where one order stands ----------
create or replace function public.so_balance(p_order uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare o record; extra numeric; paid numeric; dep numeric; due numeric;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;

  select * into o from public.service_orders where id = p_order;
  if o is null then return jsonb_build_object('found', false); end if;

  -- only changes the client confirmed count towards what they owe
  select coalesce(sum(amount_rwf),0) into extra
    from public.so_charges
   where service_order_id = p_order and agreed_by_client;

  select coalesce(sum(case when purpose='refund' then -amount_rwf else amount_rwf end),0)
    into paid from public.client_payments where service_order_id = p_order;

  select coalesce(sum(amount_rwf),0) into dep
    from public.client_payments
   where service_order_id = p_order and purpose = 'deposit';

  due := coalesce(o.total_rwf,0) + extra - paid;

  return jsonb_build_object(
    'found', true,
    'reference', o.reference,
    'event', o.event_name,
    'event_date', o.event_date,
    'order_total', coalesce(o.total_rwf,0),
    'agreed_extras', extra,
    'pending_extras', (select coalesce(sum(amount_rwf),0) from public.so_charges
                        where service_order_id = p_order and not agreed_by_client),
    'paid', paid,
    'balance', due,
    'deposit_required', coalesce(o.deposit_rwf,0),
    'deposit_paid', dep,
    -- Ingingo 13: a job is cleared to run when the agreed deposit is in
    'deposit_settled', dep >= coalesce(o.deposit_rwf,0),
    'settled', due <= 0);
end; $$;
revoke all on function public.so_balance(uuid) from public;
grant execute on function public.so_balance(uuid) to authenticated;


-- ---------- 4. Is this job cleared to run? ----------
-- The question a supervisor needs answered before the doors open.
create or replace function public.so_clearance(p_order uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare o record; a record; bal jsonb; reasons text[] := '{}';
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;

  select * into o from public.service_orders where id = p_order;
  if o is null then return jsonb_build_object('found', false); end if;

  select * into a from public.agreements where id = o.agreement_id;
  bal := public.so_balance(p_order);

  -- Ingingo 4: the work is governed by an agreement, and only a signed
  -- one binds anybody
  if a is null then
    reasons := reasons || 'No master agreement linked to this order';
  elsif a.status <> 'signed' then
    reasons := reasons || 'The master agreement is not signed';
  end if;

  -- the register's own words: draft, sent, approved, delivered,
  -- invoiced, paid, cancelled
  if o.status = 'cancelled' then
    reasons := reasons || 'This order was cancelled';
  elsif o.status in ('draft','sent') then
    reasons := reasons || 'This order has not been approved by the client';
  end if;

  if not (bal->>'deposit_settled')::boolean then
    reasons := reasons || ('Deposit outstanding: ' ||
      to_char(coalesce((bal->>'deposit_required')::numeric,0)
            - coalesce((bal->>'deposit_paid')::numeric,0), 'FM999,999,999') || ' RWF');
  end if;

  return jsonb_build_object(
    'found', true,
    'reference', o.reference,
    'event', o.event_name,
    'clear', array_length(reasons,1) is null,
    'reasons', to_jsonb(reasons),
    'balance', bal);
end; $$;
revoke all on function public.so_clearance(uuid) from public;
grant execute on function public.so_clearance(uuid) to authenticated;


-- ---------- 5. Recording money and charges ----------
create or replace function public.record_client_payment(
  p_order uuid, p_amount numeric, p_purpose text default 'balance',
  p_method text default null, p_reference text default null,
  p_received date default current_date, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_client uuid; v_id uuid;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  if p_amount is null or p_amount = 0 then
    return jsonb_build_object('ok', false, 'reason', 'no_amount');
  end if;

  select client_id into v_client from public.service_orders where id = p_order;
  if v_client is null then return jsonb_build_object('ok', false, 'reason', 'no_order'); end if;

  insert into public.client_payments (client_id, service_order_id, purpose, amount_rwf,
                                      method, reference, received_on, note, recorded_by)
  values (v_client, p_order, coalesce(p_purpose,'balance'), p_amount,
          p_method, nullif(btrim(coalesce(p_reference,'')),''),
          coalesce(p_received, current_date),
          nullif(btrim(coalesce(p_note,'')),''), auth.uid())
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'balance', public.so_balance(p_order));
end; $$;
revoke all on function public.record_client_payment(uuid,numeric,text,text,text,date,text) from public;
grant execute on function public.record_client_payment(uuid,numeric,text,text,text,date,text) to authenticated;


create or replace function public.add_so_charge(
  p_order uuid, p_kind text, p_amount numeric,
  p_description text default null, p_hours numeric default null,
  p_rate numeric default null, p_agreed boolean default false
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  if p_kind not in ('overtime','early_start','late_finish','waiting',
                    'extra_staff','equipment','other') then
    return jsonb_build_object('ok', false, 'reason', 'bad_kind');
  end if;

  insert into public.so_charges (service_order_id, kind, description, hours, rate_rwf,
                                 amount_rwf, agreed_by_client, added_by)
  values (p_order, p_kind, nullif(btrim(coalesce(p_description,'')),''),
          p_hours, p_rate, p_amount, coalesce(p_agreed,false), auth.uid())
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'balance', public.so_balance(p_order));
end; $$;
revoke all on function public.add_so_charge(uuid,text,numeric,text,numeric,numeric,boolean) from public;
grant execute on function public.add_so_charge(uuid,text,numeric,text,numeric,numeric,boolean) to authenticated;


-- ---------- 6. What is outstanding, oldest first ----------
create or replace function public.client_outstanding()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_agg(x order by x->>'event_date')
    from (
      select jsonb_build_object(
        'order_id', so.id,
        'reference', so.reference,
        'client', c.legal_name,
        'event', so.event_name,
        'event_date', so.event_date,
        'total', coalesce(so.total_rwf,0),
        'paid', coalesce((select sum(case when purpose='refund' then -amount_rwf else amount_rwf end)
                          from public.client_payments p where p.service_order_id = so.id),0),
        'balance', coalesce(so.total_rwf,0)
                 + coalesce((select sum(amount_rwf) from public.so_charges g
                             where g.service_order_id = so.id and g.agreed_by_client),0)
                 - coalesce((select sum(case when purpose='refund' then -amount_rwf else amount_rwf end)
                             from public.client_payments p where p.service_order_id = so.id),0),
        'days_since_event', (current_date - so.event_date)
      ) as x
      from public.service_orders so
      left join public.clients c on c.id = so.client_id
      where so.status <> 'cancelled'
    ) t
    where (t.x->>'balance')::numeric > 0
  ), '[]'::jsonb);
end; $$;
revoke all on function public.client_outstanding() from public;
grant execute on function public.client_outstanding() to authenticated;

-- Sanity checks
-- select public.client_outstanding();
-- select public.so_clearance('<service-order-uuid>');

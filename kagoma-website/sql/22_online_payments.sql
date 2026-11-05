-- ============================================================
-- KAGOMA — Migration 20: Paying through the system
--
--   Learner picks MoMo or card  ->  gateway checkout  ->
--   webhook confirms  ->  balance clears, with nobody typing
--   a transaction ID.
--
-- The keys never touch the browser. A checkout is opened by an Edge
-- Function and confirmed by a webhook that verifies the amount with
-- the gateway before it trusts anything.
--
-- Run AFTER 01..21. Safe to re-run.
-- ============================================================

-- ---------- 1. Gateway settings ----------
alter table public.company_settings add column if not exists psp_provider text default 'flutterwave';
alter table public.company_settings add column if not exists psp_live boolean not null default false;
alter table public.company_settings add column if not exists psp_currency text not null default 'RWF';
alter table public.company_settings add column if not exists accepts_momo boolean not null default true;
alter table public.company_settings add column if not exists accepts_card boolean not null default true;

comment on column public.company_settings.psp_live is
  'false until the merchant account is approved. While false the portal offers the manual MoMo route only.';


-- ---------- 2. One row per checkout attempt ----------
create table if not exists public.payment_sessions (
  id uuid primary key default gen_random_uuid(),
  tx_ref text unique not null,
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id text references public.courses(id) on delete set null,
  amount_rwf numeric(12,2) not null check (amount_rwf > 0),
  channel text not null default 'momo' check (channel in ('momo','card')),
  provider text not null default 'flutterwave',
  status text not null default 'created'
    check (status in ('created','pending','paid','failed','cancelled','expired')),
  provider_ref text,
  checkout_url text,
  payment_id uuid references public.payments(id),
  raw jsonb,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);
create index if not exists psess_student_idx on public.payment_sessions(student_id, created_at desc);
create index if not exists psess_status_idx  on public.payment_sessions(status);

alter table public.payment_sessions enable row level security;

-- A learner may watch their own checkout. Nobody writes from a browser:
-- rows are created and settled by the Edge Functions, service-side.
drop policy if exists "psess_own_read" on public.payment_sessions;
create policy "psess_own_read" on public.payment_sessions
  for select using (auth.uid() = student_id or public.is_admin());


-- ---------- 3. Opening a checkout ----------
-- Called by the Edge Function once it has the gateway's link, so the
-- reference and the amount are fixed here rather than in the browser.
create or replace function public.open_payment_session(
  p_student uuid, p_course text, p_amount numeric,
  p_channel text, p_tx_ref text, p_checkout_url text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.payment_sessions
    (tx_ref, student_id, course_id, amount_rwf, channel, status, checkout_url)
  values (p_tx_ref, p_student, p_course, p_amount, p_channel, 'pending', p_checkout_url)
  returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.open_payment_session(uuid,text,numeric,text,text,text) from public;


-- ---------- 4. Settling it ----------
-- The webhook calls this only after it has re-read the transaction from
-- the gateway and matched the amount. A gateway callback on its own is
-- never enough: anyone can post to a public URL.
create or replace function public.settle_payment_session(
  p_tx_ref text, p_status text, p_provider_ref text, p_amount numeric, p_raw jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare s record; v_pay uuid;
begin
  select * into s from public.payment_sessions where tx_ref = p_tx_ref;
  if s is null then return jsonb_build_object('ok', false, 'reason', 'unknown_reference'); end if;
  if s.status = 'paid' then return jsonb_build_object('ok', true, 'reason', 'already_settled'); end if;

  if p_status <> 'paid' then
    update public.payment_sessions
       set status = p_status, provider_ref = p_provider_ref, raw = p_raw, settled_at = now()
     where id = s.id;
    return jsonb_build_object('ok', true, 'status', p_status);
  end if;

  -- the amount the gateway reports must be the amount we asked for
  if p_amount is null or p_amount < s.amount_rwf then
    update public.payment_sessions
       set status = 'failed', provider_ref = p_provider_ref, raw = p_raw, settled_at = now()
     where id = s.id;
    return jsonb_build_object('ok', false, 'reason', 'amount_mismatch');
  end if;

  insert into public.payments (
    student_id, course_id, amount_rwf, method, reference, status,
    submitted_by_student, confirmed_at, paid_on, note)
  values (
    s.student_id, s.course_id, s.amount_rwf,
    case when s.channel = 'card' then 'other' else 'momo' end,
    p_provider_ref, 'confirmed', false, now(), current_date,
    'Paid online via ' || s.provider || ' (' || s.channel || ')')
  returning id into v_pay;

  update public.payment_sessions
     set status = 'paid', provider_ref = p_provider_ref, raw = p_raw,
         payment_id = v_pay, settled_at = now()
   where id = s.id;

  return jsonb_build_object('ok', true, 'status', 'paid', 'payment_id', v_pay);
end; $$;
revoke all on function public.settle_payment_session(text,text,text,numeric,jsonb) from public;


-- ---------- 5. What the portal should offer ----------
create or replace function public.payment_options()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'online',   coalesce(psp_live, false),
    'momo',     coalesce(psp_live, false) and coalesce(accepts_momo, false),
    'card',     coalesce(psp_live, false) and coalesce(accepts_card, false),
    'manual',   true,                       -- always available as a fallback
    'currency', coalesce(psp_currency, 'RWF'),
    'momo_number', momo_number,
    'momo_name',   momo_name,
    'payment_note', payment_note
  ) from public.company_settings where id = 1;
$$;
grant execute on function public.payment_options() to authenticated;


-- ---------- 6. A learner's own checkout history ----------
create or replace function public.my_payment_sessions()
returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'tx_ref', tx_ref, 'course_id', course_id, 'amount', amount_rwf,
    'channel', channel, 'status', status, 'created_at', created_at
  ) order by created_at desc), '[]'::jsonb)
  from public.payment_sessions where student_id = auth.uid();
$$;
grant execute on function public.my_payment_sessions() to authenticated;


-- ============================================================
-- PayPal is not offered, and should not be added later.
-- PayPal accounts registered in Rwanda are send-only: a Rwandan
-- business cannot receive a PayPal payment. Offering the button
-- would only fail at the last step, after the learner had tried.
-- ============================================================

-- Sanity checks
-- select public.payment_options();
-- select tx_ref, status, amount_rwf from public.payment_sessions order by created_at desc limit 10;

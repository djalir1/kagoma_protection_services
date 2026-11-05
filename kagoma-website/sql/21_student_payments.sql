-- ============================================================
-- KAGOMA — Migration 19: The learner's side of paying
--
-- The fee and the admin ledger existed, but a learner had no way to
-- pay: they could see a balance and nothing else. This adds the half
-- that was missing.
--
--   Learner pays on MoMo  ->  submits the transaction ID  ->
--   Kagoma confirms       ->  the balance clears
--
-- The same shape takes an automated MoMo collection later: the API
-- callback simply confirms the row instead of a person doing it.
--
-- Run AFTER 01..20. Safe to re-run.
-- ============================================================

alter table public.payments add column if not exists submitted_by_student boolean not null default false;
alter table public.payments add column if not exists confirmed_by uuid references public.profiles(id);
alter table public.payments add column if not exists confirmed_at timestamptz;
alter table public.payments add column if not exists rejected_reason text;

-- Where the money should be sent. Kept beside the other company
-- details so it is edited in one place.
alter table public.company_settings add column if not exists momo_name text;
alter table public.company_settings add column if not exists momo_code text;
alter table public.company_settings add column if not exists payment_note text;

update public.company_settings set
  momo_name = coalesce(momo_name, 'KAGOMA PROTECTIONS SERVICES LTD'),
  payment_note = coalesce(payment_note,
    'Andika amazina yawe n''izina ry''isomo nka reference, hanyuma wandike nimero y''igikorwa hano.')
where id = 1;


-- ---------- 1. A learner may record a payment they have made ----------
-- They may claim, never confirm. A claim counts for nothing until
-- Kagoma has seen the money, because balance_for() only sums rows
-- with status = 'confirmed'.
create or replace function public.submit_payment(
  p_course text,
  p_amount numeric,
  p_method text default 'momo',
  p_reference text default null,
  p_phone text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_owed numeric;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount <= 0 then
    return jsonb_build_object('ok', false, 'reason', 'bad_amount');
  end if;
  if p_method not in ('momo','airtel','bank','cash','other') then
    return jsonb_build_object('ok', false, 'reason', 'bad_method');
  end if;

  -- the same transaction id must not be claimed twice, by anyone
  if p_reference is not null and exists (
       select 1 from public.payments where reference = btrim(p_reference)) then
    return jsonb_build_object('ok', false, 'reason', 'duplicate_reference');
  end if;

  insert into public.payments (
    student_id, course_id, amount_rwf, method, reference, payer_phone,
    status, submitted_by_student, paid_on)
  values (
    auth.uid(), p_course, p_amount, p_method,
    nullif(btrim(coalesce(p_reference,'')),''),
    nullif(btrim(coalesce(p_phone,'')),''),
    'pending', true, current_date)
  returning id into v_id;

  v_owed := public.balance_for(auth.uid(), p_course);
  return jsonb_build_object('ok', true, 'id', v_id, 'still_owed', v_owed);
end; $$;
revoke all on function public.submit_payment(text,numeric,text,text,text) from public;
grant execute on function public.submit_payment(text,numeric,text,text,text) to authenticated;


-- ---------- 2. Kagoma confirms or rejects ----------
create or replace function public.confirm_payment(
  p_payment uuid, p_decision text, p_note text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  if p_decision not in ('confirmed','failed') then raise exception 'Unknown decision'; end if;

  update public.payments
     set status = p_decision,
         confirmed_by = auth.uid(),
         confirmed_at = now(),
         rejected_reason = case when p_decision = 'failed' then p_note else null end
   where id = p_payment;

  return jsonb_build_object('ok', true, 'status', p_decision);
end; $$;
revoke all on function public.confirm_payment(uuid,text,text) from public;
grant execute on function public.confirm_payment(uuid,text,text) to authenticated;


-- ---------- 3. The desk's queue ----------
create or replace function public.admin_pending_payments()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', p.id, 'student_id', p.student_id,
             'full_name', pr.full_name, 'phone', coalesce(p.payer_phone, pr.phone),
             'course_id', p.course_id, 'course', c.title,
             'amount', p.amount_rwf, 'method', p.method,
             'reference', p.reference, 'paid_on', p.paid_on,
             'fee', c.fee_rwf,
             'owed', public.balance_for(p.student_id, p.course_id))
           order by p.created_at)
    from public.payments p
    join public.profiles pr on pr.id = p.student_id
    left join public.courses c on c.id = p.course_id
    where p.status = 'pending'
  ), '[]'::jsonb);
end; $$;
revoke all on function public.admin_pending_payments() from public;
grant execute on function public.admin_pending_payments() to authenticated;


-- ---------- 4. What a learner owes, across everything ----------
create or replace function public.my_fees()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'course_id', c.id, 'course', c.title, 'fee', c.fee_rwf,
             'paid', coalesce((select sum(amount_rwf) from public.payments
                               where student_id = auth.uid() and course_id = c.id
                                 and status = 'confirmed'), 0),
             'pending', coalesce((select sum(amount_rwf) from public.payments
                               where student_id = auth.uid() and course_id = c.id
                                 and status = 'pending'), 0),
             'owed', public.balance_for(auth.uid(), c.id))
           order by c.sort_order)
    from public.enrollments e join public.courses c on c.id = e.course_id
    where e.student_id = auth.uid() and c.fee_rwf is not null
  ), '[]'::jsonb);
end; $$;
grant execute on function public.my_fees() to authenticated;


-- ============================================================
-- WHEN THE MTN MERCHANT ACCOUNT ARRIVES
--
-- Nothing above changes. An Edge Function receiving the MoMo
-- collection callback calls confirm_payment() with the service role
-- instead of a member of staff clicking Confirm. The learner's side,
-- the ledger and the balance all stay exactly as they are.
-- ============================================================

-- Sanity checks
-- select public.my_fees();
-- select public.admin_pending_payments();

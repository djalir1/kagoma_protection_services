-- ============================================================
-- KAGOMA — Migration 25: Bank details
--
-- Companies pay by bank transfer, not MoMo. A quotation that only
-- carries a MoMo code cannot be paid by a corporate client, whose
-- finance office needs an account name, a number, and often a SWIFT
-- code before it can release anything.
--
-- Run AFTER 01..26. Safe to re-run.
-- ============================================================

alter table public.company_settings add column if not exists bank_account_name text;
alter table public.company_settings add column if not exists bank_branch  text;
alter table public.company_settings add column if not exists bank_swift   text;
alter table public.company_settings add column if not exists bank_currency text default 'RWF';

comment on column public.company_settings.bank_account_name is
  'The name the account is held in. A finance office will refuse a transfer
   where this does not match the invoice, so it is stored separately rather
   than assumed to equal the legal name.';

-- The account name defaults to the legal name, which is the usual case.
update public.company_settings set
  bank_account_name = coalesce(bank_account_name, legal_name)
where id = 1;

-- ---------- What a payer needs, in one call ----------
create or replace function public.payment_details()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'momo', case when momo_code is not null then jsonb_build_object(
       'code', momo_code, 'name', momo_name, 'ussd', momo_ussd_pattern) end,
    'bank', case when bank_account is not null then jsonb_build_object(
       'bank', bank_name, 'account', bank_account, 'account_name', bank_account_name,
       'branch', bank_branch, 'swift', bank_swift, 'currency', bank_currency) end,
    'note', payment_note
  ) from public.company_settings where id = 1;
$$;
grant execute on function public.payment_details() to anon, authenticated;

-- ---------- Kagoma's account ----------
-- Bank, number and account name as confirmed by Kagoma. The account
-- name is stored separately from the legal name on purpose: a finance
-- office matches the name on the invoice against the name on the
-- account, and holds the payment when they differ.
update public.company_settings set
  bank_name         = 'Equity Bank Rwanda PLC',
  bank_account      = '4002201404367',
  bank_account_name = 'KAGOMA PROTECTIONS SERVICES LTD',
  bank_currency     = 'RWF'
where id = 1;

-- >>> Ntibisabwa / optional. Uzuza gusa niba ubikeneye.
--
-- Ishami: ntibisabwa ku bwishyu bwo mu Rwanda.
-- SWIFT:  bikenewe gusa ku mafaranga aturutse hanze y'u Rwanda.
--         Equity Bank Rwanda ikoresha EQBLRWRW, ariko GENZURA
--         kuri banki mbere yo kuyishyiraho: kode itari yo ituma
--         amafaranga yo hanze agaruka cyangwa agatinda.
--
-- update public.company_settings set
--   bank_branch = 'Kicukiro',
--   bank_swift  = 'EQBLRWRW'
-- where id = 1;

-- Sanity check
-- select public.payment_details();

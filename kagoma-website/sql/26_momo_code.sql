-- ============================================================
-- KAGOMA — Migration 24: The MoMo Pay code
--
-- Kagoma has a MoMo Pay merchant code, not a personal number. That
-- matters: a learner dials a USSD string, not a phone number, and
-- the payment lands in the company account under the company name.
--
-- Storing the code and the pattern separately lets the portal build
-- the exact string a learner should dial, amount already filled in.
--
-- Run AFTER 01..25. Safe to re-run.
-- ============================================================

alter table public.company_settings add column if not exists momo_code text;
alter table public.company_settings add column if not exists momo_ussd_pattern text;

update public.company_settings set
  momo_code         = '061457',
  momo_name         = 'KAGOMA PROTECTIONS SERVICES LTD',
  momo_ussd_pattern = '*182*8*1*061457*{amount}#',
  payment_note      = 'Kanda *182*8*1*061457*<amafaranga># hanyuma wemeze na PIN. '
                   || 'Amafaranga agera kuri KAGOMA PROTECTIONS SERVICES LTD. '
                   || 'Nyuma andika nimero y''igikorwa iri muri SMS.'
where id = 1;

comment on column public.company_settings.momo_ussd_pattern is
  'The dial string with {amount} as the placeholder. The portal fills it in
   so the learner never types the amount into the wrong position.';

-- ---------- What the portal needs to show ----------
create or replace function public.payment_options()
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'online',   coalesce(psp_live, false),
    'momo',     coalesce(psp_live, false) and coalesce(accepts_momo, false),
    'card',     coalesce(psp_live, false) and coalesce(accepts_card, false),
    'manual',   true,
    'currency', coalesce(psp_currency, 'RWF'),
    'momo_number',   momo_number,
    'momo_code',     momo_code,
    'momo_name',     momo_name,
    'momo_ussd',     momo_ussd_pattern,
    'payment_note',  payment_note
  ) from public.company_settings where id = 1;
$$;
grant execute on function public.payment_options() to authenticated;

-- Sanity check
-- select public.payment_options();

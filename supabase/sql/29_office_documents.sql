-- ============================================================
-- KAGOMA — Migration 27: The rest of the paperwork
--
-- The office could write an agreement but not an invoice, which
-- means Kagoma could win the work and then have no way to bill for
-- it. These fill the gaps, and they follow the service pipeline
-- that already exists:
--
--   Request -> Risk assessment -> Quotation -> Agreement ->
--   Deployment (post orders) -> Report -> Invoice -> Receipt
--
-- Run AFTER 01..28. Safe to re-run.
-- ============================================================

-- A row already in the table can block a constraint. Rather than fail,
-- relabel anything unrecognised and keep it: a document someone was
-- shown should not stop an upgrade, and should not vanish either.
do $$
declare n int;
begin
  if to_regclass('public.documents') is null then return; end if;
  update public.documents set kind = 'profile'
   where kind not in (
     'profile','agreement','employment','quotation',
     'invoice','receipt','nda','risk_assessment',
     'post_orders','incident','service_report','employment_letter',
     'employee_rules','code_of_conduct','warning');
  get diagnostics n = row_count;
  if n > 0 then raise notice 'Relabelled % document(s) of an unknown kind.', n; end if;
end $$;

alter table public.documents drop constraint if exists documents_kind_check;
-- The full set, matching every later migration. A constraint must only
-- ever widen: if this file listed fewer kinds than a later one, re-running
-- the set in order would fail on any document of a kind added later.
alter table public.documents add constraint documents_kind_check
  check (kind in (
    'profile','agreement','employment','quotation',
    'invoice','receipt','nda','risk_assessment',
    'post_orders','incident','service_report','employment_letter',
    'employee_rules','code_of_conduct','warning'));

create or replace function public.next_document_ref(p_kind text)
returns text language sql volatile as $$
  select case p_kind
           when 'agreement'         then 'KPS-AGR-'
           when 'employment'        then 'KPS-EMP-'
           when 'quotation'         then 'KPS-QTN-'
           when 'profile'           then 'KPS-PRO-'
           when 'invoice'           then 'KPS-INV-'
           when 'receipt'           then 'KPS-RCT-'
           when 'nda'               then 'KPS-NDA-'
           when 'risk_assessment'   then 'KPS-RSK-'
           when 'post_orders'       then 'KPS-PST-'
           when 'incident'          then 'KPS-INC-'
           when 'service_report'    then 'KPS-RPT-'
           when 'employment_letter' then 'KPS-LTR-'
           else 'KPS-DOC-'
         end
       || to_char(now(),'YYYY') || '-'
       || lpad(nextval('public.document_seq')::text, 4, '0');
$$;

-- An invoice that has been paid should say so, and a receipt should
-- point at the invoice it settles.
alter table public.documents add column if not exists amount_rwf numeric(12,2);
alter table public.documents add column if not exists paid_on date;
alter table public.documents add column if not exists related_ref text;

create index if not exists documents_related_idx on public.documents(related_ref);

-- Sanity check
-- select kind, count(*) from public.documents group by kind order by 1;

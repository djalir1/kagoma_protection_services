-- ============================================================
-- KAGOMA — Migration 42: The Master Agreement and the Service Order
--
-- The agreement in the office was a single twenty-clause document that
-- tried to be both the standing contract and the paperwork for a job.
-- Kagoma's adviser prepared a proper Master Service Agreement: signed
-- once with a client, with each event carried on its own Service Order
-- that becomes part of it.
--
-- The office now produces both, so the documents table must allow the
-- new kind.
--
-- Run AFTER 01..43. Safe to re-run.
-- ============================================================

do $$
declare n int;
begin
  if to_regclass('public.documents') is null then return; end if;
  update public.documents set kind = 'profile'
   where kind not in (
     'profile','agreement','service_order','employment','quotation',
     'invoice','receipt','nda','risk_assessment',
     'post_orders','incident','service_report','employment_letter',
     'employee_rules','code_of_conduct','warning');
  get diagnostics n = row_count;
  if n > 0 then raise notice 'Relabelled % document(s) of an unknown kind.', n; end if;
end $$;

alter table public.documents drop constraint if exists documents_kind_check;
alter table public.documents add constraint documents_kind_check
  check (kind in (
    'profile','agreement','service_order','employment','quotation',
    'invoice','receipt','nda','risk_assessment',
    'post_orders','incident','service_report','employment_letter',
    'employee_rules','code_of_conduct','warning'));

-- A Service Order belongs to a Master Agreement. Recording which one
-- is what lets the office show, a year later, what a client actually
-- signed up to.
alter table public.documents add column if not exists parent_ref text;
create index if not exists documents_parent_idx on public.documents(parent_ref);

comment on column public.documents.parent_ref is
  'For a Service Order: the reference of the Master Service Agreement it sits under.';

-- Check
select kind, count(*) from public.documents group by 1 order by 1;

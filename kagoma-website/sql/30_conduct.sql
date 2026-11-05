-- ============================================================
-- KAGOMA — Migration 28: Employee Rules and Code of Conduct
--
-- Two documents every employer needs, and a security company needs
-- more than most. When something goes wrong on a job, the first
-- question asked is what the staff member was told, and whether
-- they signed for it. These are the answer to that question.
--
-- Run AFTER 01..29. Safe to re-run.
-- ============================================================

alter table public.documents drop constraint if exists documents_kind_check;
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
           when 'employee_rules'    then 'KPS-RUL-'
           when 'code_of_conduct'   then 'KPS-COC-'
           when 'warning'           then 'KPS-WRN-'
           else 'KPS-DOC-'
         end
       || to_char(now(),'YYYY') || '-'
       || lpad(nextval('public.document_seq')::text, 4, '0');
$$;

-- Who has signed for what. A rule nobody signed for is hard to enforce.
create table if not exists public.policy_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid references public.profiles(id) on delete set null,
  staff_name text not null,
  policy text not null check (policy in ('employee_rules','code_of_conduct')),
  version text,
  document_ref text,
  signed_on date not null default current_date,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists ack_staff_idx on public.policy_acknowledgements(staff_name);
alter table public.policy_acknowledgements enable row level security;

drop policy if exists "ack_admin" on public.policy_acknowledgements;
create policy "ack_admin" on public.policy_acknowledgements
  for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "ack_own_read" on public.policy_acknowledgements;
create policy "ack_own_read" on public.policy_acknowledgements
  for select using (auth.uid() = staff_id or public.is_admin());

-- The version in force, so a document can say which edition was signed.
alter table public.company_settings add column if not exists rules_version text default '1.0';
alter table public.company_settings add column if not exists conduct_version text default '1.0';

-- Sanity check
-- select staff_name, policy, version, signed_on from public.policy_acknowledgements order by signed_on desc;

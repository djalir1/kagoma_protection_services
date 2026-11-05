-- ============================================================
-- KAGOMA — Migration 16: The office
--
--   Company profile · Service agreements · Employment contracts
--   · Quotations
--
-- Every document is built from one row of company details, so the
-- legal name, TIN and address are never retyped and never disagree
-- between one contract and the next.
--
-- Run AFTER 01..17. Safe to re-run.
-- ============================================================

-- ---------- 1. Who the company is, in one place ----------
create table if not exists public.company_settings (
  id int primary key default 1 check (id = 1),      -- exactly one row
  -- Taken from the RDB full registration certificate of 12 June 2026.
  -- The legal name is 'PROTECTIONS' with an S; the brand is 'Protection'
  -- without one. Both are correct in their own place, so both are stored.
  legal_name text not null default 'KAGOMA PROTECTIONS SERVICES LTD',
  trading_name text not null default 'Kagoma Protection Services',
  tin text default '156478327',
  company_code text default '156478327',
  registered_on date default '2026-06-10',
  company_category text default 'Private — Company Limited By Shares',
  address_line text default 'Mushumbamwiza, Rwimbogo, Nyarugunga, Kicukiro, Umujyi wa Kigali, Rwanda',
  district text default 'Kicukiro',
  sector text default 'Nyarugunga',
  registered_email text default 'kagomaprotections@proton.me',
  financial_year_start text default '01-01',
  main_activity text default 'SN823001 — Organisation, promotion and/or management of events such as business and trade shows, conventions, conferences and meetings',
  other_activities text default 'SM749008 — Security consulting'||chr(10)||'SK661205 — Security and commodity contracts dealing activities',
  phone_1 text default '+250 788 225 262',   -- as registered: +250788225262
  phone_2 text default '+250 798 005 444',
  email text default 'info@kagomaprotection.com',
  website text default 'https://kagomaprotection.com',
  bank_name text,
  bank_account text,
  momo_number text default '0788 225 262',
  director_name text default 'Honore CYUBAHIRO Elyse',
  director_title text default 'Managing Director',
  director_postnominals text default 'SRMP-C · SRMP-R',
  vat_registered boolean not null default false,
  vat_rate numeric(5,2) not null default 18.00,
  updated_at timestamptz not null default now()
);

insert into public.company_settings (id) values (1) on conflict (id) do nothing;

-- Fill in the registration details on a row that predates this migration,
-- but never overwrite something already entered by hand.
update public.company_settings set
  legal_name        = 'KAGOMA PROTECTIONS SERVICES LTD',
  tin               = coalesce(tin, '156478327'),
  company_code      = coalesce(company_code, '156478327'),
  registered_on     = coalesce(registered_on, date '2026-06-10'),
  address_line      = coalesce(nullif(address_line,'Kigali, Rwanda'),
                       'Mushumbamwiza, Rwimbogo, Nyarugunga, Kicukiro, Umujyi wa Kigali, Rwanda'),
  director_name     = coalesce(nullif(director_name,''), 'Honore CYUBAHIRO Elyse'),
  director_title    = coalesce(nullif(director_title,''), 'Managing Director')
where id = 1;

-- These arrived after the table was first created, so they have to be
-- added explicitly. "create table if not exists" does nothing to a table
-- that already exists, and the office page would fail to save without them.
alter table public.company_settings add column if not exists company_category    text;
alter table public.company_settings add column if not exists registered_email    text;
alter table public.company_settings add column if not exists financial_year_start text;
alter table public.company_settings add column if not exists main_activity       text;
alter table public.company_settings add column if not exists other_activities    text;

update public.company_settings set
  company_category     = coalesce(company_category, 'Private — Company Limited By Shares'),
  registered_email     = coalesce(registered_email, 'kagomaprotections@proton.me'),
  financial_year_start = coalesce(financial_year_start, '01-01'),
  main_activity        = coalesce(main_activity,
    'SN823001 — Organisation, promotion and/or management of events such as business and trade shows, conventions, conferences and meetings'),
  other_activities     = coalesce(other_activities,
    'SM749008 — Security consulting' || chr(10) || 'SK661205 — Security and commodity contracts dealing activities')
where id = 1;

alter table public.company_settings enable row level security;

-- Anyone signed in may read it (documents and letterheads need it);
-- only staff may change it.
drop policy if exists "company_read" on public.company_settings;
create policy "company_read" on public.company_settings
  for select using (auth.uid() is not null);
drop policy if exists "company_write" on public.company_settings;
create policy "company_write" on public.company_settings
  for all using (public.is_admin()) with check (public.is_admin());


-- ---------- 2. Documents the office issues ----------
create sequence if not exists public.document_seq start 1;

create or replace function public.next_document_ref(p_kind text)
returns text language sql volatile as $$
  select case p_kind
           when 'agreement'  then 'KPS-AGR-'
           when 'employment' then 'KPS-EMP-'
           when 'quotation'  then 'KPS-QTN-'
           when 'profile'    then 'KPS-PRO-'
           else 'KPS-DOC-'
         end
       || to_char(now(),'YYYY') || '-'
       || lpad(nextval('public.document_seq')::text, 4, '0');
$$;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  kind text not null
    check (kind in ('agreement','employment','quotation','profile')),
  title text not null,
  -- who it is for
  party_name text,
  party_org text,
  party_email text,
  party_phone text,
  party_address text,
  -- the body, kept as data so a document can be reopened and reprinted
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'draft'
    check (status in ('draft','issued','signed','declined','expired','cancelled')),
  valid_until date,
  issued_on date,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists documents_kind_idx on public.documents(kind, created_at desc);
create index if not exists documents_status_idx on public.documents(status);

alter table public.documents enable row level security;

drop policy if exists "documents_admin" on public.documents;
create policy "documents_admin" on public.documents
  for all using (public.is_admin()) with check (public.is_admin());

-- Give every document its reference automatically.
create or replace function public.trg_document_ref()
returns trigger language plpgsql as $$
begin
  if new.reference is null or new.reference = '' then
    new.reference := public.next_document_ref(new.kind);
  end if;
  new.updated_at := now();
  return new;
end; $$;

drop trigger if exists trg_document_ref on public.documents;
create trigger trg_document_ref
before insert or update on public.documents
for each row execute function public.trg_document_ref();


-- ---------- 3. Sanity checks ----------
-- select * from public.company_settings;
-- select reference, kind, title, status from public.documents order by created_at desc;

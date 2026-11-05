-- ============================================================
-- KAGOMA — Migration 29: The Director's signature
--
-- A scanned signature is a credential. Anyone who holds the image
-- can put it on any document, so it is kept in its own table with
-- its own policy: staff only, read and write. It is deliberately
-- NOT in company_settings, which any signed-in account may read.
--
-- Run AFTER 01..30. Safe to re-run.
-- ============================================================

create table if not exists public.company_signature (
  id int primary key default 1 check (id = 1),
  signature_data text,          -- data URL of the signature image
  signatory_name text default 'Honore CYUBAHIRO Elyse',
  signatory_title text default 'Managing Director',
  signatory_postnominals text default 'SRMP-C · SRMP-R',
  active boolean not null default true,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now()
);

insert into public.company_signature (id) values (1) on conflict (id) do nothing;

alter table public.company_signature enable row level security;

-- No public read, no learner read. Staff only, both ways.
drop policy if exists "signature_admin_only" on public.company_signature;
create policy "signature_admin_only" on public.company_signature
  for all using (public.is_admin()) with check (public.is_admin());

comment on table public.company_signature is
  'Staff-only. The image never reaches a browser that is not signed in as staff.';


-- Which documents were issued signed, and by whom. If a signed
-- document is ever questioned, this is the record that answers it.
alter table public.documents add column if not exists signed boolean not null default false;
alter table public.documents add column if not exists signed_by uuid references public.profiles(id);
alter table public.documents add column if not exists signed_at timestamptz;

create index if not exists documents_signed_idx on public.documents(signed, created_at desc);


create or replace function public.get_signature()
returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  return coalesce((
    select jsonb_build_object(
      'data', signature_data, 'name', signatory_name,
      'title', signatory_title, 'post', signatory_postnominals,
      'active', active)
    from public.company_signature where id = 1), '{}'::jsonb);
end; $$;
revoke all on function public.get_signature() from public;
grant execute on function public.get_signature() to authenticated;


create or replace function public.set_signature(p_data text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Staff only'; end if;
  update public.company_signature
     set signature_data = p_data, updated_by = auth.uid(), updated_at = now()
   where id = 1;
end; $$;
revoke all on function public.set_signature(text) from public;
grant execute on function public.set_signature(text) to authenticated;

-- Sanity check
-- select signatory_name, active, length(signature_data) from public.company_signature;
